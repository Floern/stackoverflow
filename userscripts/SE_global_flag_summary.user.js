// ==UserScript==
// @name          Stack Exchange Global Flag Summary
// @namespace     http://floern.com/
// @version       0.5.1
// @description   Stack Exchange network wide flag summary available in your network profile
// @author        Floern
// @include       *://stackexchange.com/users/*/*
// @match         *://*.stackexchange.com/users/flag-summary/*
// @match         *://*.stackoverflow.com/users/flag-summary/*
// @match         *://*.superuser.com/users/flag-summary/*
// @match         *://*.serverfault.com/users/flag-summary/*
// @match         *://*.askubuntu.com/users/flag-summary/*
// @match         *://*.stackapps.com/users/flag-summary/*
// @match         *://*.mathoverflow.net/users/flag-summary/*
// @connect       stackexchange.com
// @connect       stackoverflow.com
// @connect       superuser.com
// @connect       serverfault.com
// @connect       askubuntu.com
// @connect       stackapps.com
// @connect       mathoverflow.net
// @grant         GM_xmlhttpRequest
// @grant         GM_addStyle
// @run-at        document-end
// ==/UserScript==

let flagSummaryTable, flagSummaryTableBody;

let sortedColIndex = 2;
let sortedColAsc = false;

let flagGlobalSummaryStats = {
    sumFlagsTotal: 0,
    sumFlagsDeclined: 0,
    sumFlagsDisputed: 0,
    sumFlagsRetracted: 0,
    sumFlagsExpired: 0,
    sumFlagsPending: 0,
    sumFlagsHelpful: 0
};


// init
(function () {
    if (window.location.href.match(/\/users\/flag-summary\/\d+/i)) {
        showGlobalFlagSummaryLink();
        return;
    }
    
    if (!window.location.href.match(/:\/\/stackexchange\.com\/users\/\d+/i)) {
        return;
    }
    
    let navigation = document.querySelector('#content .contentWrapper .subheader');
    if (!navigation) {
        return;
    }
    
    let tabbar = navigation.querySelector('.tabs');
    
    // verify that we are in the profile of the logged in user
    let tabs = tabbar.getElementsByTagName('a');
    let loggedIn = false;
    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].textContent.trim().toLowerCase() == 'inbox') {
            loggedIn = true;
            break;
        }
    }
    if (!loggedIn) {
        return;
    }
    
    // add navigation tab for flags
    let flagTab = document.createElement('a');
    flagTab.setAttribute('href', '?tab=flags');
    flagTab.textContent = 'flags';
    tabs[4].parentNode.insertBefore(flagTab, tabs[4]);
    
    if (!window.location.href.match(/:\/\/stackexchange\.com\/users\/\d+\/.+?\?tab=flags/i)) {
        return;
    }
    
    // unselect default tab
    let selectedTab = navigation.querySelector('.youarehere');
    selectedTab.className = '';
    
    // set selected tab to flags
    flagTab.className = 'youarehere';
    
    // remove default content
    while (navigation.nextSibling) {
        navigation.parentNode.removeChild(navigation.nextSibling);
    }
    
    document.querySelector('title').textContent = 'Flag Summary - Stack Exchange';
    
    let container = document.createElement('div');
    navigation.parentNode.appendChild(container);

    // setup summary table
    flagSummaryTable = document.createElement('table');
    flagSummaryTable.id = 'flag-summary-table';
    flagSummaryTable.style.width = '100%';
    flagSummaryTable.style.textAlign = 'right';
    flagSummaryTable.style.borderCollapse = 'separate';
    flagSummaryTable.style.borderSpacing = '0 5px';
    flagSummaryTable.innerHTML = `
        <thead>
            <tr id="flag-summary-heading-labels" style="cursor:pointer">
                <th style="text-align:left;width:160px" colspan="2">Site</th>
                <th>helpful</th>
                <th>declined</th>
                <th>disputed</th>
                <th>expired</th>
                <th>retracted</th>
                <th>pending</th>
                <th style="padding-left:20px">total</th>
                <th>helpful %</th>
                <th>last flag</th>
            </tr>
            <tr id="flag-summary-global-stats">
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    container.appendChild(flagSummaryTable);
    
    // make columns sortable
    let tableLabelNodes = flagSummaryTable.querySelectorAll('#flag-summary-heading-labels th');
    for (let i = 0; i < tableLabelNodes.length; i++) {
        let col = i + 1;
        tableLabelNodes[i].onclick = function() {
            sortedColAsc = col == sortedColIndex ? !sortedColAsc : false;
            sortTable(col, sortedColAsc);
        }
    }
    
    flagSummaryTableBody = flagSummaryTable.getElementsByTagName('tbody')[0];
    
    // some table CSS
    GM_addStyle("#flag-summary-table tbody tr:hover { background: rgba(127, 127, 127, .15); }");
    GM_addStyle("#flag-summary-global-stats th { border-bottom: 1px #ddd solid; }");
    
    // init global flag summary
    updateGlobalFlagStats();
    
    // create loading view
    let loadingView = document.createElement("div");
    loadingView.id = 'flag-summary-loading';
    loadingView.style.textAlign = 'center';
    loadingView.innerHTML = '<img src="/content/img/progress-dots.gif" alt="Loading..." />';
    container.appendChild(loadingView);
    
    // load data
    loadAccountList();
})();


/**
 * Add a link to the flag summary page.
 */
function showGlobalFlagSummaryLink() {
    let header = document.querySelector('#content .subheader');
    if (!header) {
        return;
    }
    
    // add link to header
    let segfsLink = document.createElement('a');
    segfsLink.setAttribute('href', '//stackexchange.com/users/current?tab=flags');
    segfsLink.textContent = 'Global Flag Summary';
    segfsLink.style.float = 'right';
    segfsLink.style.paddingTop = '13px';
    header.insertBefore(segfsLink, header.firstChild);
}


/**
 * Update global flag summary in header.
 */
function updateGlobalFlagStats() {
    let realTotal = flagGlobalSummaryStats.sumFlagsHelpful + flagGlobalSummaryStats.sumFlagsDeclined;
    let helpfulFraction = realTotal == 0 ? 0 : (flagGlobalSummaryStats.sumFlagsHelpful / realTotal);
    
    document.getElementById('flag-summary-global-stats').innerHTML = `
        <th colspan="2"></th>
        <th style="color:#090">` + formatFlagCount(flagGlobalSummaryStats.sumFlagsHelpful) + `</th>
        <th style="color:#f00">` + formatFlagCount(flagGlobalSummaryStats.sumFlagsDeclined) + `</th>
        <th style="color:#f80">` + formatFlagCount(flagGlobalSummaryStats.sumFlagsDisputed) + `</th>
        <th>` + formatFlagCount(flagGlobalSummaryStats.sumFlagsExpired) + `</th>
        <th style="color:#999">` + formatFlagCount(flagGlobalSummaryStats.sumFlagsRetracted) + `</th>
        <th>` + formatFlagCount(flagGlobalSummaryStats.sumFlagsPending) + `</th>
        <th>` + formatFlagCount(flagGlobalSummaryStats.sumFlagsTotal) + `</th>
        <th>` + (realTotal == 0 ? '' : formatFlagPercentage(helpfulFraction)) + `</th>
        <th></th>
    `;
}


/**
 * Load the network account list.
 */
function loadAccountList() {
    GM_xmlhttpRequest({
        method: 'GET',
        url: '//stackexchange.com/users/current?tab=accounts',
        onload: function(response) {
            parseNetworkAccounts(response.response);
        },
        onerror: function(response) {
            console.error('loadAccountList: ' + JSON.stringify(response));
        }
    });
}


/**
 * Parse the network account list.
 */
function parseNetworkAccounts(html) {
    let pageNode = document.createElement('div');
    pageNode.innerHTML = html;
    
    let accounts = [];
    
    // iterate all accounts
    let accountNodes = pageNode.querySelectorAll('.contentWrapper .account-container');
    for (let i = 0; i < accountNodes.length; ++i) {
        let accountNode = accountNodes[i];
        
        let siteLinkNode = accountNode.querySelector('.account-site a');
        if (!siteLinkNode) {
            continue;
        }
        if (siteLinkNode.href.indexOf('area51.stackexchange.com/') != -1) {
            // use discuss.area51.SE instead
            siteLinkNode.href = siteLinkNode.href.replace('//area51.st', '//discuss.area51.st');
        }
        
        let siteName = siteLinkNode.textContent.trim();
        let siteUserFlagSummaryUrl = siteLinkNode.href.replace(/users\/(\d+)\/.*$/i, 'users/flag-summary/$1');
        
        // get badge count, used for prioritization
        let badgeCount = 0;
        let badgeNodes = accountNode.querySelectorAll('.badgecount');
        for (let j = 0; j < badgeNodes.length; ++j) {
            badgeCount += parseInt(badgeNodes[j].textContent.trim());
        }
        
        accounts.push({siteName: siteName, flagSummaryUrl: siteUserFlagSummaryUrl, loadPriority: badgeCount});
        
        // include meta site
        if (!/(meta\.stackexchange|area51\.stackexchange|stackapps)\.com/.test(siteLinkNode.href)) {
            let metaSiteUserFlagSummaryUrl = siteUserFlagSummaryUrl.replace('//', '//meta.');
            accounts.push({siteName: siteName + " Meta", flagSummaryUrl: metaSiteUserFlagSummaryUrl, loadPriority: badgeCount - 1.5});
        }
    }
    
    // sort by badge count desc, so we load sites with more badges earlier, since those have higher chances of flag 
    accounts = accounts.sort(function (a, b) {
        return b.loadPriority - a.loadPriority;
    });
    
    // load the sites
    let i = -1;
    function loadNextSite() {
        i++;
        if (i >= accounts.length) {
            // end of list
            document.getElementById('flag-summary-loading').style.visibility = 'hidden';
            return;
        }
        
        loadSiteFlagSummary(accounts[i].siteName, accounts[i].flagSummaryUrl, loadNextSite);
    };
    
    // start 4 'threads' in parallel
    loadNextSite();
    loadNextSite();
    loadNextSite();
    loadNextSite();
}


/**
 * Load the flag summary of the specified site.
 */
function loadSiteFlagSummary(siteName, siteUserFlagSummaryUrl, finishedCallback) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: siteUserFlagSummaryUrl,
        onload: function(response) {
            finishedCallback();
            parseSiteFlagSummary(siteName, siteUserFlagSummaryUrl, response.response);
        },
        onerror: function(response) {
            console.error('loadSiteFlagSummary: ' + siteUserFlagSummaryUrl);
            console.error('loadSiteFlagSummary: ' + JSON.stringify(response));
            finishedCallback();
        }
    });
}


/**
 * Parses the flag summary site and extracts the stats.
 */
function parseSiteFlagSummary(siteName, siteUserFlagSummaryUrl, html) {
    let pageNode = document.createElement('div');
    pageNode.innerHTML = html;
    
    let sumFlagsTotal = 0;
    let sumFlagsDeclined = 0;
    let sumFlagsDisputed = 0;
    let sumFlagsRetracted = 0;
    let sumFlagsExpired = 0;
    let sumFlagsPending = 0;
    let sumFlagsHelpful = 0;
    
    // search for flag stats
    let flagCountNodes = pageNode.querySelectorAll('#flag-stat-info-table > tbody > tr > td.col2 > a[href*="status="]');
    for (let i = 0; i < flagCountNodes.length; i++) {
        let flagType = parseInt(flagCountNodes[i].href.replace(/^.+?\bstatus=(\d+).*$/, '$1'));
        let flagCount = parseInt(previousElementSibling(flagCountNodes[i].parentElement).textContent.replace(/\D/g, ''));
        
        sumFlagsTotal += flagCount;
        
        switch (flagType) {
            case 1: // pending
                sumFlagsPending += flagCount; break;
            case 2: // helpful
                sumFlagsHelpful += flagCount; break;
            case 3: // declined
                sumFlagsDeclined += flagCount; break;
            case 4: // disputed
                sumFlagsDisputed += flagCount; break;
            case 5: // expired
                sumFlagsExpired += flagCount; break;
            case 6: // retracted
                sumFlagsRetracted += flagCount; break;
            default:
                console.error('parseSiteFlagSummary: unknown flag type #' + flagType);
                break;
        }
    }
    
    if (sumFlagsTotal == 0) {
        // skip site with no flags
        return;
    }
    
    // update global summary
    flagGlobalSummaryStats.sumFlagsTotal += sumFlagsTotal;
    flagGlobalSummaryStats.sumFlagsDeclined += sumFlagsDeclined;
    flagGlobalSummaryStats.sumFlagsDisputed += sumFlagsDisputed;
    flagGlobalSummaryStats.sumFlagsRetracted += sumFlagsRetracted;
    flagGlobalSummaryStats.sumFlagsExpired += sumFlagsExpired;
    flagGlobalSummaryStats.sumFlagsPending += sumFlagsPending;
    flagGlobalSummaryStats.sumFlagsHelpful += sumFlagsHelpful;
    
    updateGlobalFlagStats();
    
    // compute helpful percentage
    let realTotal = sumFlagsHelpful + sumFlagsDeclined;
    let helpfulFraction = realTotal == 0 ? 0 : (sumFlagsHelpful / realTotal);
    
    // get most recent flag date
    let flagHistoryDates = pageNode.querySelectorAll('.user-flag-history .mod-flag .relativetime');
    let mostRecentflagHistoryDateNode = flagHistoryDates[0];
    let lastFlagTimestamp = mostRecentflagHistoryDateNode.title;
    let lastFlagTimeDisplay = formatTimeRelative(lastFlagTimestamp);
    
    // get site icon
    let siteFaviconURL = pageNode.querySelector('link[rel*="icon"]').href;
    
    // create table row for this site
    let siteFlagSummaryTr = document.createElement('tr');
    siteFlagSummaryTr.innerHTML = `
        <td style="text-align:left;width:24px"><img src="` + siteFaviconURL + `" 
            style="width:16px;height:16px;vertical-align:middle" /></td>
        <td style="text-align:left"><a href="` + siteUserFlagSummaryUrl + `">` + siteName + `</a></td>
        <td style="color:#090">` + formatFlagCount(sumFlagsHelpful) + `</td>
        <td style="color:#f00">` + formatFlagCount(sumFlagsDeclined) + `</td>
        <td style="color:#f80">` + formatFlagCount(sumFlagsDisputed) + `</td>
        <td>` + formatFlagCount(sumFlagsExpired) + `</td>
        <td style="color:#999">` + formatFlagCount(sumFlagsRetracted) + `</td>
        <td>` + formatFlagCount(sumFlagsPending) + `</td>
        <td>` + formatFlagCount(sumFlagsTotal) + `</td>
        <td>` + (realTotal == 0 ? '-' : formatFlagPercentage(helpfulFraction)) + `</td>
        <td style="color:#999" title="` + lastFlagTimestamp + `">` + lastFlagTimeDisplay + `</td>
    `;
    flagSummaryTableBody.appendChild(siteFlagSummaryTr);
    
    // keep order
    sortTable(sortedColIndex, sortedColAsc);
}


/**
 * Format flag count, empty if 0.
 */
function formatFlagCount(flagCount) {
    if (flagCount == 0)
        return '';
    else
        return flagCount;
}


/**
 * Format helpful flag percentage.
 */
function formatFlagPercentage(fraction) {
    return (fraction * 100).toFixed(2) + '%';
}


function formatTimeRelative(e) {
    if (null != e && 20 == e.length) {
        e = e.substr(0, 10) + "T" + e.substr(11, 10);
        let date = new Date(e),
            dsecs = Math.floor(((new Date).getTime() - date.getTime()) / 1e3),
            ddays = Math.floor(dsecs / 86400);
        if (0 <= ddays && ddays < 7) {
            if (dsecs < 2) return 'just now';
            if (dsecs < 60) return dsecs + ' secs ago';
            if (dsecs < 120) return '1 min ago';
            let dmins = Math.floor(dsecs / 60);
            if (dmins < 60) return dmins + ' mins ago';
            if (dmins < 120) return '1 hour ago';
            let dhrs = Math.floor(dmins / 60);
            if (dhrs < 18) return dhrs + ' hours ago';
            if (dhrs < 48) return 'yesterday';
            else return ddays + ' days ago';
        }
        else {
            let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months[date.getMonth()] + ' ' + date.getDate() + 
                (date.getFullYear() != (new Date).getFullYear() ? " '" + date.getFullYear().substring(2, 2) : '');
        }
    }
    else {
        return e;
    }
}


/**
 * Find the previous non-text sibling node.
 */
function previousElementSibling(node) {
    do {
        node = node.previousSibling;
    } while (node && node.nodeType !== 1);
    return node;
}


/**
 * Sort the table.
 */ 
function sortTable(col, asc) {
    sortedColIndex = col;
    let trs = Array.prototype.slice.call(flagSummaryTableBody.rows, 0);
    asc = -((+asc) || -1);
    if (col == 1) {
        trs = trs.sort(function (a, b) {
            return asc * (a.cells[col].textContent.trim().localeCompare(b.cells[col].textContent.trim()));
        });
    }
    else if (col == 10) {
        trs = trs.sort(function (a, b) {
            return asc * (a.cells[col].title.localeCompare(b.cells[col].title));
        });
    }
    else {
        trs = trs.sort(function (a, b) {
            return asc
                * ((parseInt(b.cells[col].textContent.replace(/\D/g, '')) || 0) - 
                (parseInt(a.cells[col].textContent.replace(/\D/g, '')) || 0) );
        });
    }
    for(let i = 0; i < trs.length; ++i) flagSummaryTableBody.appendChild(trs[i]);
}


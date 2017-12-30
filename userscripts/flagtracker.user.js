// ==UserScript==
// @name          Stack Exchange Flag Tracker
// @namespace     https://so.floern.com/
// @version       1.0
// @description   Tracks flagged posts on Stack Exchange.
// @author        Floern
// @match         *://*.stackexchange.com/*/*
// @match         *://*.stackoverflow.com/*/*
// @match         *://*.superuser.com/*/*
// @match         *://*.serverfault.com/*/*
// @match         *://*.askubuntu.com/*/*
// @match         *://*.stackapps.com/*/*
// @match         *://*.mathoverflow.net/*/*
// @connect       so.floern.com
// @require       https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @require       https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js
// @grant         GM.xmlHttpRequest
// @grant         GM_xmlhttpRequest
// @updateURL     https://raw.githubusercontent.com/Floern/stackoverflow/master/userscripts/flagtracker.meta.js
// @downloadURL   https://raw.githubusercontent.com/Floern/stackoverflow/master/userscripts/flagtracker.user.js
// ==/UserScript==

function computeContentHash(postContent) {
    if (!postContent)
        return 0;
    var hash = 0;
    for (var i = 0; i < postContent.length; ++i) {
        hash = ((hash << 5) - hash) + postContent.charCodeAt(i);
        hash = hash & hash;
    }
    return hash;
}

function sendTrackRequest(postId, feedback) {
    if ($('#answer-' + postId + ' .post-text, [data-questionid="' + postId + '"] .post-text').length === 0) {
        return;
    }
    if ($('.top-bar .my-profile .gravatar-wrapper-24').length === 0) {
        alert('Flag Tracker: Could not find username.');
    }

    var flaggername = $('.top-bar .my-profile .gravatar-wrapper-24').attr('title');
	var postContent = $('#answer-' + postId + ' .post-text, [data-questionid="' + postId + '"] .post-text').html().trim();
    var contentHash = computeContentHash(postContent);
    GM.xmlHttpRequest({
        method: 'POST',
        url: 'https://so.floern.com/api/trackpost.php',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: 'key=Cm45BSrt51FR3ju' +
              '&postId=' + postId +
              '&site=' + window.location.hostname +
              '&contentHash=' + contentHash +
              '&flagger=' + encodeURIComponent(flaggername),
        onload: function (response) {
            if (response.status !== 200) {
                alert('Flag Tracker Error: Status ' + response.status);
                return;
            }
            $('#answer-' + postId + ' a.flag-tracker-link, [data-questionid="' + postId + '"] a.flag-tracker-link')
                    .addClass('flag-tracked').html('tracked');
        },
        onerror: function (response) {
            alert('Flag Tracker Error: ' + response.responseText);
        }
    });
}

function sendRequest(event) {
    var messageJSON;
    try {
        messageJSON = JSON.parse(event.data);
    } catch (zError) { }
    if (!messageJSON) return;
    if (messageJSON[0] == 'postFlagTrack') {
        sendTrackRequest(messageJSON[1]);
    }
}

window.addEventListener('message', sendRequest, false);

const ScriptToInject = function() {
    function addXHRListener(callback) {
        let open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            this.addEventListener('load', callback.bind(null, this), false);
            open.apply(this, arguments);
        };
    }

    function trackFlag(e) {
        e.preventDefault();
        var $this = $(this);
        if ($this.closest('a.flag-tracked').length > 0) return false;
        var postId = $this.closest('div.post-menu').find('a.short-link').attr('id').split('-')[2];
        if (!confirm('Do you want to track this post?')) return false;
        window.postMessage(JSON.stringify(['postFlagTrack', postId]), "*");
    }

    function handlePosts(postId) {
        var $posts;
        if (!postId) {
            $posts = $('.answer .post-menu, .question .post-menu');
        }
        else {
            $posts = $('[data-answerid="' + postId + '"] .post-menu, [data-questionid="' + postId + '"] .post-menu');
        }
        $posts.each(function() {
            var $this = $(this);
            $this.append($('<span>').attr('class', 'lsep').html('|'));
            $this.append($('<a>').attr('class', 'flag-tracker-link').attr('title', 'register this post to be tracked')
                    .html('track').click(trackFlag));
        });
    }

    addXHRListener(function(xhr) {
        if (/ajax-load-realtime/.test(xhr.responseURL)) {
            let matchesA = /answer" data-answerid="(\d+)/.exec(xhr.responseText);
            if (matchesA !== null) {
                handlePosts(matchesA[1]);
            }
            let matchesQ = /question" data-questionid="(\d+)/.exec(xhr.responseText);
            if (matchesQ !== null) {
                handlePosts(matchesQ[1]);
            }
        }
    });

    addXHRListener(function(xhr) {
        let matches = /flags\/posts\/(\d+)\/add\//.exec(xhr.responseURL);
        if (matches !== null && xhr.status === 200) {
            window.postMessage(JSON.stringify(['postFlagTrack', matches[1]]), "*");
        }
    });

    $(document).ready(function() {
        handlePosts();
    });

};

const ScriptToInjectNode = document.createElement('script');
document.body.appendChild(ScriptToInjectNode);

const ScriptToInjectContent = document.createTextNode('(' + ScriptToInject.toString() + ')()');
ScriptToInjectNode.appendChild(ScriptToInjectContent);

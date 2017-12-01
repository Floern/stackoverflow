// ==UserScript==
// @name         Stack Exchange Helpful Flag Percentage
// @namespace    http://floern.com/
// @version      1.0
// @description  Helpful flag percentage for the flag summary page
// @author       enki / Floern
// @match        *://*.stackexchange.com/users/flag-summary/*
// @match        *://*.stackoverflow.com/users/flag-summary/*
// @match        *://*.superuser.com/users/flag-summary/*
// @match        *://*.serverfault.com/users/flag-summary/*
// @match        *://*.askubuntu.com/users/flag-summary/*
// @match        *://*.stackapps.com/users/flag-summary/*
// @match        *://*.mathoverflow.net/users/flag-summary/*
// @updateURL    https://raw.githubusercontent.com/Floern/stackoverflow/master/userscripts/helpful_flag_percentage.meta.js
// @downloadURL  https://raw.githubusercontent.com/Floern/stackoverflow/master/userscripts/helpful_flag_percentage.user.js
// ==/UserScript==

$(function () {
'use strict';

    var helpfulFlags = 0;
    $("td > a:contains('helpful')").parent().prev().each(function () {
        helpfulFlags += parseInt($(this).text().replace(",",""));
    });

    var declinedFlags = 0;
    $("td > a:contains('declined')").parent().prev().each(function () {
        declinedFlags += parseInt($(this).text().replace(",",""));
    });

    if (helpfulFlags > 0) {
        var percentHelpful = (helpfulFlags / (helpfulFlags + declinedFlags)) * 100;
        var decimals = percentHelpful >= 99.9 ? 3 : (percentHelpful >= 90 ? 2 : 1);
        percentHelpful = Number(Math.round(percentHelpful + 'e' + decimals) + 'e-' + decimals);

        if (percentHelpful > 100) {
            percentHelpful = 100;
        }

        var percentColor;
        if (percentHelpful >= 90) {
            percentColor = "limegreen";
        } else if (percentHelpful >= 80) {
            percentColor = "darkorange";
        } else {
            percentColor = "red";
        }

        var css = "<style>\
                    #progress {\
                        background: #ccc;\
                        height: 10px;\
                        width: 220px;\
                        margin: 6px 10px 10px 0;\
                        padding: 0px;\
                    }\
                    #progress:after {\
                        content: '';\
                        display: block;\
                        background: " + percentColor + ";\
                        width: " + percentHelpful + "%;\
                        height: 100%;\
                    }\
                    #percentHelpful {\
                        margin-bottom: 5px;\
                    }\
                    </style>";

        $('head').append(css);

        $("#flag-stat-info-table").before("<h3 id='percentHelpful' title='pending, aged away and disputed" +
                " flags are not counted'><span id='percent'>" + percentHelpful + "%</span> helpful</h3>");
        $("span#percent").css("color", percentColor);

        $("#percentHelpful").after("<div id='progress'></div>");
    }
});

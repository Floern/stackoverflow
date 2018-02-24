// ==UserScript==
// @name          Stack Exchange Flag Tracker
// @namespace     https://so.floern.com/
// @version       1.1
// @description   Tracks flagged posts on Stack Exchange.
// @author        Floern
// @match         *://*.stackexchange.com/*/*
// @match         *://*.stackoverflow.com/*/*
// @match         *://*.superuser.com/*/*
// @match         *://*.serverfault.com/*/*
// @match         *://*.askubuntu.com/*/*
// @match         *://*.stackapps.com/*/*
// @match         *://*.mathoverflow.net/*/*
// @match         *://chat.stackoverflow.com/rooms/111347/*
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

window.addEventListener('message', sendRequest, false);

const ScriptToInjectNode = document.createElement('script');
document.body.appendChild(ScriptToInjectNode);

const ScriptToInjectContent = document.createTextNode('(' + ScriptToInject.toString() + ')()');
ScriptToInjectNode.appendChild(ScriptToInjectContent);

function ChatControls() {
    if ($('#active-user .avatar img').length === 0) {
        return;
    }
    var flaggername = $('#active-user .avatar img').attr('title').replace(' ', '');
    console.log(flaggername);

    const ready = CHAT.Hub.roomReady;
    CHAT.Hub.roomReady = {
        fire: function(...args) {
            ready.fire(...args);

            function eventHandler(event) {
                if (event.room_id !== CHAT.CURRENT_ROOM_ID ||
                   event.event_type !== 1 ||
                   event.user_id !== 7481043) return;

                const content = document.createElement('div');
                content.innerHTML = event.content;

                if (!/A [\w\s]+ post has been edited:/i.test(content.textContent)) return;
                if (content.textContent.indexOf(' @' + flaggername) === -1) return;

                function send(message) {
                    $.ajax({
                        'type': 'POST',
                        'url': `/chats/${CHAT.CURRENT_ROOM_ID}/messages/new`,
                        'data': fkey({text: message}),
                        'dataType': 'json'
                    });
                }

                function clickHandler(message) {
                    return function(event) {
                        event.preventDefault();
                        send(message);
                    };
                }

                function createLink(message) {
                    const node = document.createElement('a');
                    node.href = "#";
                    node.textContent = message;
                    node.addEventListener('click', clickHandler(`:${event.message_id} ${message}`), false);
                    return node;
                }

                setTimeout(() => {
                    const message = document.querySelector(`#message-${event.message_id} .content`);
                    const wrap = document.createElement('span');
                    wrap.appendChild(document.createTextNode(' ['));
                    wrap.appendChild(createLink('untrack'));
                    wrap.appendChild(document.createTextNode('] '));
                    message.appendChild(wrap);
                }, 0);
            }

            function handleLoadedEvents(handler) {
                [...(document.querySelectorAll('.user-container') || [])].forEach(container => {
                    [...(container.querySelectorAll('.message') || [])].forEach(message => handler({
                        room_id: CHAT.CURRENT_ROOM_ID,
                        event_type: 1,
                        user_id: +(container.className.match(/user-(\d+)/) || [])[1],
                        message_id: +(message.id.match(/message-(\d+)/) || [])[1],
                        content: message.querySelector('.content').innerHTML
                    }));
                });
            }

            CHAT.addEventHandlerHook(eventHandler);
            handleLoadedEvents(eventHandler);
        }
    };
}

if (window.location.href.match(/\/chat\.stack\w+\.com\/rooms\/\d+/i)) {
    const script = document.createElement('script');
    script.textContent = `(${ ChatControls.toString() })();`;
    document.body.appendChild(script);
}

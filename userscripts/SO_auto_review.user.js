// ==UserScript==
// @name         Stack Overflow Auto Review
// @namespace    https://so.floern.com/
// @version      0.1
// @description  Automatically skips through the review queue and completes a review task of a post that you have already handled outside of the queue.
// @author       Floern
// @include      /^https?:\/\/stackoverflow\.com\/review/first-posts(\/\d+)?$/
// @include      /^https?:\/\/stackoverflow\.com\/review/late-answers(\/\d+)?$/
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js
// @grant        none
// ==/UserScript==

this.$ = this.jQuery = jQuery.noConflict(true);

(function() {
	let reviewTimer;
	const playStateKey = 'autorreview_is_playing_' + window.location.pathname.replace(/^\/[^\/]+\/([^\/]+)(\/.*)?$/, '$1').replace(/\W/g, '_');
	let playButton;
	
	function setPlaying(playing) {
		window.clearTimeout(reviewTimer);
		
		document.cookie = playStateKey + '=' + (playing ? '1' : '0') + '; path=/';
		
		if (playing) {
			reviewTimer = window.setTimeout(function(){ handleReview(); }, 500);
		}
		
		updateControlsState();
	}
	
	function isPlaying() {
		let cookieVal = document.cookie.match('(^|;)\\s*' + playStateKey + '\\s*=\\s*([^;]+)');
		return cookieVal && cookieVal.pop() == '1';
	}
	
	function setupControls() {
		playButton = $('<input>').attr('type', 'button');
		
		playButton.click(function() {
			window.clearTimeout(reviewTimer);
			setPlaying(!isPlaying());
		});
		
		let controlBox = $('<div>').css('float', 'right').css('margin-right', '20px');
		controlBox.append(playButton);
		$('#badge-progress').after(controlBox);
		
		updateControlsState();
	}
	
	function updateControlsState() {
		let playing = isPlaying();
		
		playButton.val('Auto Review  ' + (playing ? '❚❚' : '▶'));
		
		let reviewActionBar = $('.review-bar .review-actions');
		let reviewInfoBox = $('.review-bar .review-instructions.infobox');
		let infoText = reviewInfoBox.text();
		
		let playDisabled = (infoText.indexOf('queue has been cleared') < 0 && infoText.indexOf('no items for you to review') < 0) && 
				(
					!$('.review-content .reviewable-post').length || 
					infoText.indexOf('Thank you for reviewing') >= 0 || 
					infoText.indexOf('Review completed') >= 0 || 
					reviewActionBar.find(':input[value="Next"]').length
				);
		
		playButton.prop('disabled', playDisabled);
	}
	
	function handleReview() {
		let reviewInfoBox = $('.review-bar .review-instructions.infobox');
		let infoText = reviewInfoBox.text();
		
		if (infoText.indexOf('queue has been cleared') >= 0 || infoText.indexOf('no items for you to review') >= 0) {
			// empty queue, wait for some time, then try again
			if (isPlaying()) {
				window.clearTimeout(reviewTimer);
				reviewTimer = window.setTimeout(function(){ window.location.reload(); }, 2 * 60 * 1000);
			}
			return;
		}
		else if (infoText.indexOf('Thank you for reviewing') >= 0) {
			// review limit reached
			setPlaying(false);
			return;
		}
		else if (infoText.indexOf('Review completed') >= 0) {
			// not visited through auto processing
			return;
		}
		
		let reviewActionBar = $('.review-bar .review-actions');
		
		let nextButton = reviewActionBar.find(':input[value="Next"]');
		if (nextButton.length && !nextButton.is(':disabled')) {
			// not visited through auto processing
			return;
		}
		
		if (!isPlaying()) {
			return;	
		}
		
		let doneButton = reviewActionBar.find(':input[value="I\'m Done"]');
		let skipButton = reviewActionBar.find(':input[value="Skip"]');
		if (doneButton.length && !doneButton.is(':disabled')) {
			doneButton.click();
			return;
		}
		else if (skipButton.length) {
			skipButton.click();
			return;
		}
		alert("should not happen");
	};
	
	function addXHRListener(callback) {
		let open = XMLHttpRequest.prototype.open;
		XMLHttpRequest.prototype.open = function() {
			this.addEventListener('load', callback.bind(null, this), false);
			open.apply(this, arguments);
		};
	};

	setupControls();
	
	addXHRListener(function(xhr) {
		let matches = /review\/next-task/.test(xhr.responseURL) || /review\/task-reviewed/.test(xhr.responseURL);
		if (matches && xhr.status === 200) {
			window.clearTimeout(reviewTimer);
			reviewTimer = window.setTimeout(function(){ handleReview(); }, 3000);
			updateControlsState();
		}
	});
	
})();

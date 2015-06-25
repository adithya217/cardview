
// semicolon helps to separate and prevent this function from being an argument to another
// function in some other file when all the files are concatenated and minified.
;(function ($, window, document, Math) {
	
'use strict'; // to validate regular syntax mistakes

var rAF = window.requestAnimationFrame	||
	window.webkitRequestAnimationFrame	||
	window.mozRequestAnimationFrame		||
	window.oRequestAnimationFrame		||
	window.msRequestAnimationFrame		||
	function (callback) { window.setTimeout(callback, 1000 / 60); };

var utils = (function () {
	var me = {};

	var _elementStyle = document.createElement('div').style;
	var _vendor = (function () {
		var vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'],
			transform,
			i = 0,
			l = vendors.length;

		for ( ; i < l; i++ ) {
			transform = vendors[i] + 'ransform';
			if ( transform in _elementStyle ) return vendors[i].substr(0, vendors[i].length-1);
		}

		return false;
	})();

	function _prefixStyle (style) {
		if ( _vendor === false ) return false;
		if ( _vendor === '' ) return style;
		return _vendor + style.charAt(0).toUpperCase() + style.substr(1);
	}

	me.getTime = Date.now || function getTime () { return new Date().getTime(); };

	me.extend = function (target, obj) {
		for ( var i in obj ) {
			target[i] = obj[i];
		}
	};

	me.addEvent = function (el, type, fn, capture) {
		el.addEventListener(type, fn, !!capture);
	};

	me.removeEvent = function (el, type, fn, capture) {
		el.removeEventListener(type, fn, !!capture);
	};

	var _transform = _prefixStyle('transform');

	me.extend(me, {
		hasTransform: _transform !== false,
		hasPerspective: _prefixStyle('perspective') in _elementStyle,
		hasTouch: 'ontouchstart' in window,
		hasPointer: navigator.msPointerEnabled,
		hasTransition: _prefixStyle('transition') in _elementStyle
	});

	me.extend(me.style = {}, {
		transform: _transform,
		transitionTimingFunction: _prefixStyle('transitionTimingFunction'),
		transitionDuration: _prefixStyle('transitionDuration'),
		transformOrigin: _prefixStyle('transformOrigin'),
		perspective: _prefixStyle('perspective'),
		transformStyle: _prefixStyle('transformStyle')
	});

	me.extend(me.eventType = {}, {
		touchstart: 1,
		touchmove: 1,
		touchend: 1,

		mousedown: 2,
		mousemove: 2,
		mouseup: 2,

		MSPointerDown: 3,
		MSPointerMove: 3,
		MSPointerUp: 3
	});

	me.tap = function (e, eventName) {
		var ev = document.createEvent('Event');
		ev.initEvent(eventName, true, true);
		ev.pageX = e.pageX;
		ev.pageY = e.pageY;
		e.target.dispatchEvent(ev);
	};

	return me;
})();

////////////////////////////////////////////////////////////////////////////////////////////////////////

function CardView (el, options) {
    $.Velocity.defaults.duration = 0;
    $.Velocity.defaults.easing = 'ease-out';
    
	this.wrapper = typeof el == 'string' ? document.querySelector(el) : el;
	this.root = this.wrapper;
	this.deck = this.wrapper = this.wrapper.children[0];
	this.cards = this.deck.querySelectorAll('.jscard');
	
	this.topReached = 0; // a variable to hold state for topReached
	this.bottomReached = 0; // a variable to hold state for bottomReached
	
	// variable to store time of last swipe - useful in debouncing
	this.lastSwipeTime = utils.getTime();
	
	// transition variable for translating to origin
	this.originTransition = { translateX : 0, translateY : 0, translateZ : 0 };

	this.options = {
		direction : 'v',
		effect : 'slide',
		startPage : 0,
		loopable : false, // option to toggle loopable cards
		debounce : true, // a boolean to specify whether to use debouncing
		debounceThreshold : 150, // time interval in ms for debouncing
		swipeTimeLT : 100, // lower threshold for time taken to finish swipe, in ms
		swipeTimeHT : 500, // upper threshold for time taken to finish swipe, in ms

		duration : 250,
		perspective : '300px',
		resizePolling : 100,

		dataset : [],
		onUpdateContent : function () {},
		topReached : function () {}, // function to call when top of the card deck reached
		bottomReached : function () {} // function to call when bottom of the card deck reached
	};

	for ( var i in options ) {
		this.options[i] = options[i];
	}

	this.options.direction = this.options.direction != 'v' && this.options.direction != 'vertical' ? 'h' : 'v';
	
	// a list to hold the swipe events as they arrive
	this.swipeEventList = [];
	
	// a variable to hold the swipe event being currently processed
	this.SwipeEventInProgress = undefined;
	
	// a flag for transitions in progress
	this.transitionInProgress = false;

	this.page = 0;
	this.pageCount = Math.max(this.options.dataset.length, 3);
	
	// variable for maintaining item count
	this.dataItemCount = this.options.dataset.length;
	
	// threshold value for identifying swipe gesture
	this.distanceThreshold = 50;
	
	this.wrapper.style[utils.style.perspective] = this.options.perspective;

	for ( var i = 0; i < 3; i++ ) {
		this.cards[i].style[utils.style.transformOrigin] = '0 100%';
	}

	this.goToPage(this.options.startPage);		// load initial content

	this._initEvents();

	this._resize(); // refresh after a small timeout
}

CardView.prototype = {
	handleEvent: function (e) {
		switch ( e.type ) {
			case 'touchstart':
			case 'MSPointerDown':
			case 'mousedown':
				this._start(e);
				break;
			case 'touchmove':
			case 'MSPointerMove':
			case 'mousemove':
				this._move(e);
				break;
			case 'touchend':
			case 'MSPointerUp':
			case 'mouseup':
			case 'touchcancel':
			case 'MSPointerCancel':
			case 'mousecancel':
				this._end(e);
				break;
			case 'orientationchange':
			case 'resize':
				this._resize();
				break;
			case 'DOMMouseScroll':
			case 'mousewheel':
				//this._wheel(e);
				break;
			case 'keydown':
				//this._key(e);
				break;
		}
	},

	_initEvents: function (remove) {
		var eventType = remove ? utils.removeEvent : utils.addEvent;

		eventType(window, 'orientationchange', this);
		eventType(window, 'resize', this);

		eventType(this.wrapper, 'mousedown', this);
		eventType(window, 'mousemove', this);
		eventType(window, 'mousecancel', this);
		eventType(window, 'mouseup', this);

		if ( utils.hasPointer ) {
			eventType(this.wrapper, 'MSPointerDown', this);
			eventType(window, 'MSPointerMove', this);
			eventType(window, 'MSPointerCancel', this);
			eventType(window, 'MSPointerUp', this);
		}

		if ( utils.hasTouch ) {
			eventType(this.wrapper, 'touchstart', this);
			eventType(window, 'touchmove', this);
			eventType(window, 'touchcancel', this);
			eventType(window, 'touchend', this);
		}
	},

	destroy: function () {
		this._initEvents(true);
	},

	refresh: function () {
		this.wrapperSize = this.options.direction == 'v' ? this.wrapper.offsetHeight : this.wrapper.offsetWidth;
	},

	_resize: function () {
		var that = this;

		clearTimeout(this.resizeTimeout);

		this.resizeTimeout = setTimeout(this.refresh.bind(this), this.options.resizePolling);
	},
	
	// function to update current dataset
	updateDataset: function(newCards) {
	    // add new cards to existing cards
	    this.options.dataset.push.apply(this.options.dataset, newCards);
	    
	    // update the no. of items present
	    this.pageCount = this.options.dataset.length;
	    this.dataItemCount = this.pageCount; // update the custom variable also
	},

	_start: function (e) {
		// React to left mouse button only
		if ( utils.eventType[e.type] != 1 ) {
			if ( e.button !== 0 ) {
				return;
			}
		}

		var point = e.touches ? e.touches[0] : e,
			pos;

		this.direction      = 0;
		this.startTime      = utils.getTime();
		this.startX         = point.pageX;
		this.startY         = point.pageY;
		this.absDistance    = 0;
		this.swiped         = false;
	},
	
	_move: function (e) {
		var point = e.touches ? e.touches[0] : e,
			distance,
			direction;

		distance = this.options.direction == 'h' ? -(point.pageX - this.startX) : point.pageY - this.startY;
		this.absDistance = Math.abs(distance);
		this.direction = -distance / this.absDistance;

        // loopable option check
		if(!this.options.loopable){
            if(this.direction < 0){
                // moving up
                if(this.page === 0){ // first card in view
                    if(this.topReached == 0) {
                        this.topReached = 1; // state machine needed as move can be triggered multiple times
                        this.options.topReached();
                    }
                    
                    return;
                } else {
                    this.topReached = 0;
                }
            } else if(this.direction > 0){
                // moving down
                if(this.page === this.dataItemCount-1){ // last card in view
                    if(this.bottomReached == 0) {
                        this.bottomReached = 1; // state machine needed as move can be triggered multiple times
                        this.options.bottomReached();
                    }
                    
                    return;
                } else {
                    this.bottomReached = 0;
                }
            }
		}

		if ( this.absDistance > this.distanceThreshold ) {
		    // logic for time difference
			var delta = utils.getTime() - this.startTime,
            dynamicDuration = Math.round(delta / 5) * 5; // to round off to nearest multiple of 5
            
			if(dynamicDuration < this.options.swipeTimeLT)
			    dynamicDuration = this.options.swipeTimeLT;
			else if(dynamicDuration > this.options.swipeTimeHT)
			    dynamicDuration = this.options.swipeTimeHT;
			
			this.options.duration = dynamicDuration;
			
			this.swiped = true;
		}
	},

	_end: function (e) {
	    if(!this.swiped)
	        return;
	        
		if(this.absDistance == 0)
		    return;
		    
	    if(this.debounceEvents()){
	        return;
	    }
	    
	    var swipeEvent = {
	        direction : this.direction,
	        duration : this.options.duration
	    };
	    
	    this.swipeEventList.push(swipeEvent);
	    
	    this.slideCards();
	},
	
	// a debouncing function using time of last swipe events
	debounceEvents : function(){
	    if(!this.options.debounce)
	        return false;
	        
	    var timeNow = utils.getTime(),
	    timeLast = this.lastSwipeTime,
	    timeDiff = timeNow - timeLast;
	    
	    this.lastSwipeTime = timeNow;
	    
	    if(timeDiff < this.options.debounceThreshold){
	        return true;
	    } else {
	        return false;
	    }
	},
	
	_transitionEnd: function () {
		this.page += this.SwipeEventInProgress.direction;
		if ( this.page >= this.pageCount ) {
			this.page = 0;
		} else if ( this.page < 0 ) {
			this.page = this.pageCount - 1;
		}

		this.currCard += this.SwipeEventInProgress.direction;
		if ( this.currCard >= 3 ) {
			this.currCard = 0;
		} else if ( this.currCard < 0 ) {
			this.currCard = 2;
		}

		this.prevCard = this.currCard - 1;
		if ( this.prevCard < 0 ) {
			this.prevCard = 2;
		}

		this.nextCard = this.currCard + 1;
		if ( this.nextCard == 3 ) {
			this.nextCard = 0;
		}
		
		this._arrangeCards(true);
	},
	
	// function to be used as velocity callback - to hide card before animating
	cardHideOnBegin : function(elements){
	    elements[0].style.display = 'none';
	},
	
	// function to be used as velocity callback - to show card after animating
	cardShowOnComplete : function(elements){
	    elements[0].style.display = 'block';
	},

	_arrangeCards: function (updateContent) {
		var prevCard = this.cards[this.prevCard],
	        currCard = this.cards[this.currCard],
		    nextCard = this.cards[this.nextCard],
	        transition = { translateZ : 0 };
	        
        prevCard.style.zIndex = '99';
		currCard.style.zIndex = '100';
		nextCard.style.zIndex = '101';
	        
	    if(this.options.direction == 'v'){
	        transition.translateX = 0;
	        transition.translateY = '100%';
	    } else {
	        transition.translateX = '100%';
	        transition.translateY = 0;
	    }
	    
	    var context = this, pcFinished = false, ncFinished = false,
	    prevCardOptions = {
	        begin : this.cardHideOnBegin,
	        complete : function(elements){
	            context.cardShowOnComplete(elements);
	            pcFinished = true;
	            
	            if(updateContent && pcFinished && ncFinished)
	                context._updateContent();
	        }
	    },
	    nextCardOptions = {
	        begin : this.cardHideOnBegin,
	        complete : function(elements){
	            context.cardShowOnComplete(elements);
	            ncFinished = true;
	            
	            if(updateContent && pcFinished && ncFinished)
	                context._updateContent();
	        }
	    };
	    
	    $.Velocity(prevCard, this.originTransition, prevCardOptions);
	    $.Velocity(nextCard, transition, nextCardOptions);
	},

	_updateContent: function () {
		var newPage = this.page + this.SwipeEventInProgress.direction,
			cardToUpdate = this.SwipeEventInProgress.direction > 0 ? this.nextCard : this.prevCard;

		if ( newPage < 0 ) {
			newPage = this.pageCount - 1;
		} else if ( newPage >= this.pageCount ) {
			newPage = 0;
		}
		
		var cardToUpdate = this.cards[cardToUpdate],
		    newContent = this.options.dataset[newPage];
		
		this.options.onUpdateContent(cardToUpdate, newContent);
	},
	
	// function to go to the first card
	goToTop: function()
	{
	    this.goToPage(0); // go to the first page
	    this.page = 0; // update the page value
	},

	goToPage: function (n) {
		if ( n == 'last' ) {
			n = this.pageCount - 1;
		} else if ( n == 'prev' ) {
			n--;
		} else if ( n == 'next' ) {
			n++;
		}

		if ( n < 0 ) {
			n = 0;
		} else if ( n >= this.pageCount ) {
			n = this.pageCount - 1;
		}

		var prev = n - 1,
			next = n + 1;

		if ( prev < 0 ) {
			prev = this.pageCount - 1;
		}

		if ( next >= this.pageCount ) {
			next = 0;
		}

		this.prevCard = 2;
		this.currCard = 0;
		this.nextCard = 1;
		
		this.options.onUpdateContent(this.cards[this.currCard], this.options.dataset[n]);
		this.options.onUpdateContent(this.cards[this.nextCard], this.options.dataset[next]);
		this.options.onUpdateContent(this.cards[this.prevCard], this.options.dataset[prev]);
		
		this._arrangeCards(false);
	},

	/**********************************************
	 *
	 * Effect Slide
	 *
	 **********************************************/
	 
	 // function to decide what cards to move
	 pickCards : function(swipeEvent){
	    if ( swipeEvent.direction < 0 ) {
			this.cardToMove = this.currCard;
			this.cardToStay = this.prevCard;
		} else {
			this.cardToMove = this.nextCard;
			this.cardToStay = this.currCard;
		}
	 },
	 
	 // function to slide cards
	 slideCards : function(){
        if(this.transitionInProgress)
            return;
        
        this.transitionInProgress = true;
        
        // get the swipe event with FIFO mechanism
        var swipeEvent = this.swipeEventList.shift();
        
        // to allow global access to the swipeEvent currently being processed
        this.SwipeEventInProgress = swipeEvent;
    
	    this.pickCards(swipeEvent);
	    
		var cardToMove = this.cards[this.cardToMove],
			cardToStay = this.cards[this.cardToStay],
			transition = { translateZ : 0 };

		if ( swipeEvent.direction > 0 ) {
			transition.translateX = transition.translateY = 0;
		} else {
			if ( this.options.direction == 'v' ) {
				transition.translateX = 0;
				transition.translateY = '100%';
			} else {
				transition.translateX = '-100%';
				transition.translateY = 0;
			}
		}
		
		var context = this,
		    options = {
    		    duration : swipeEvent.duration,
    		    complete : function(elements){
    		        context._transitionEnd();
    		        context.transitionInProgress = false;
    		        
    		        if(context.swipeEventList.length)
    		            context.slideCards();
    		    }
		    };
		
		$.Velocity(cardToMove, transition, options);
	 }

};

//Expose the class either via AMD, CommonJS or the global object
if (typeof define === 'function' && define.amd) {
	define(['velocity'], function () {
		return CardView;
	});
}
else if (typeof module === 'object' && module.exports){
	module.exports = CardView;
} else {
    window.CardView = CardView;
}


})(jQuery, window, document, Math);

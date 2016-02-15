;function factory(Hammer, Velocity){
	
	var cardView = function(wrapper, options){
		/*
		 * This is the constructor for the plugin.
		 * All preprocessing before initialization is to be done here.
		 */
		Velocity.defaults.duration = 0;
		Velocity.defaults.easing = 'ease-out';
		
		/*
		 * variable for translating to origin, using 0.1px for translateZ
		 * because velocity keeps auto-removing translateZ(0) after animation
		 * completes. Seems to cause layout thrashing and slightly jerky animation.
		 */
		this.originTranslation = { translateY : 0, translateZ : '0.1px' };
		this.edgeTranslation = { translateY : '100%', translateZ : '0.1px' };
		
		this.options = {
			startFromIndex : 0, // index of item in dataset to start deck with
			deckSize : 3, // no. of cards in the deck
			cardSelector : '.jscard', // default selector for the cards in the deck

		    swipeThreshold : 75, // distance to swipe to auto complete the remainder
		    transitionDurationLT : 200, // lower threshold for transitionDuration in ms
			transitionDuration : 250, // time for card slide transition in ms
			transitionDurationHT : 500, // higher threshold for transitionDuration in ms

			dataset: [],
			onUpdateContent: function(el, data){},
		
			topReached : function(){}, // callback when swiping down at the top of the card deck
			bottomReached : function(){}, // callback when swiping up at the bottom of the card deck
		
			onDeckUpdated : function(data, page){}, // callback to indicate deck updated with new cards
			onCardFlick : function(direction, oldCard, newCard){} // callback to indicate new card
		};
	
		Hammer.extend(this.options, options);
	
		// maintain a reference to the element on which hammer is applied.
		this.hammeredElement = undefined;
	
		// parent container of the card elements
		this.wrapper = wrapper;
		this.wrapperSize = this.wrapper.offsetHeight;
	
		// list of cards in the deck
		this.cards = wrapper.querySelectorAll(this.options.cardSelector);
	
		// flag for indicating dataset has been updated
		this.datasetUpdated = false;
	
		// variable for maintaining item count
		this.dataItemCount = this.options.dataset.length;
	
		// flag for indicating that next card has to be updated manually with a new data item
		this.updateNextCardManually = false;
	
		// this value must not exceed the dataset length
		if((this.options.startFromIndex < 0) || (this.options.startFromIndex >= this.dataItemCount)){
		    this.options.startFromIndex = 0; // reset to 0 if it exceeds bounds of the dataset
		}
	
		this.page = this.options.startFromIndex;
		this.pageCount = Math.max(this.dataItemCount, this.options.deckSize);
	
		// flags for checking top, bottom reached states in the card deck
		this.topReached = 0;
		this.bottomReached = 0;
	
		// execute the callback just before cards are about to be initialized
		this.options.onDeckUpdated(this.options.dataset, 0);
	
		this.initCards();
	};

	cardView.prototype = {
		initCards : function(){
			/*
			 * When initializing, arrange cards first, before updating content,
			 * because, we don't want the cards to display in a wrong order and then
			 * rearrange in a flash.
			 */
			
			var data = this.setCardsOrder(this.page);
			
			var prevCard = this.cards[this.prevCard];
			var currCard = this.cards[this.currCard];
			var nextCard = this.cards[this.nextCard];
		
			var context = this;
		
			var ncaFinished = false;
		    var pcaFinished = false;
			
			var ncOptions = {
		        complete : function(){
		            ncaFinished = true;
		            
		            nextCard.style.zIndex = '101';
		            
		            if(ncaFinished && pcaFinished){
		                context.setCardsContent(data.n, data.next, data.prev);
		                context.initTouchListeners();
		            }
		        }
		    };
		
			var pcOptions = {
		        complete : function(){
		            pcaFinished = true;
		            
		            prevCard.style.zIndex = '99';
		            
		            if(ncaFinished && pcaFinished){
		                context.setCardsContent(data.n, data.next, data.prev);
		                context.initTouchListeners();
		            }
		        }
		    };
			
			var ccOptions = {
			    complete : function(){
			        Velocity(nextCard, context.edgeTranslation, ncOptions);
			        Velocity(prevCard, context.edgeTranslation, pcOptions);
			    }
			};
			
			currCard.style.zIndex = '100';
			Velocity(currCard, this.originTranslation, ccOptions);
		},
	
		initTouchListeners : function()
		{
			/*
			 * This flag is used to check if the pan event received is the first event.
			 * Using this due to a bug in Hammer. It would be fixed in the release of Hammer js
			 */
			this.isFirstEvent = true;
			
			/*
			 * This flag is used to prevent any interactions on the deck when auto slide to finish is in motion.
			 */
			this.autoSlideFinish = false;
		
			/*
			 * This flag is used to check if a card motion has been started.
			 */
			this.cardMovementStarted = false;
		
			/*
			 * This flag is used to check if touch origin is reached when dragging in the
			 * opposite direction to which the original movement was started.
			 */
			this.cardOriginReached = false;
		
			/*
			 * This flag is used to allow / prevent any interactions on the deck
			 */
			this.deckEnabled = true;
		
			var context = this;
			
			this.hammeredElement = new Hammer(this.wrapper);
		
			// let the pan gesture support vertical directions.
			// this will block the vertical scrolling on a touch-device while on the element
			this.hammeredElement.get('pan').set({ direction: Hammer.DIRECTION_VERTICAL });
		
			this.hammeredElement.on('pandown', function(event){ context.onPanDown.call(context, event); });
			this.hammeredElement.on('panup', function(event){ context.onPanUp.call(context, event); });
			this.hammeredElement.on('panend', function(event){ context.onPanEnd.call(context, event); });
		},
	
		onPanDown : function(event){
			// pandown is to view previous card
			if(!this.deckEnabled){
				return;
			}
		
			if((this.page === 0) && (!this.cardMovementStarted)){
				// first card in view
				if(event.distance >= this.options.swipeThreshold){
					// only proceed when swipe threshold is satisfied
					if(this.topReached === 0) {
		                this.topReached = 1; // update flag to prevent checking multiple times
		                
		                var firstCard = this.options.dataset[this.page];
		                
		                this.options.topReached(firstCard);
		            }
				}
		        
		        return;
		    } else {
		        this.topReached = 0;
		        
		        // reset these flags, since the deck will have been updated with other swipes
		        this.updateNextCardManually = false;
		        this.datasetUpdated = false;
		    }
		    
		    if(this.isFirstEvent){
		        this.isFirstEvent = false;
		        this.cardMovementStarted = false;
		        this.cardOriginReached = false;
		        
		        this.cardToMove = this.currCard;
				this.cardToStay = this.prevCard;
			
				var cardToStay = this.cards[this.cardToStay];
				Velocity(cardToStay, this.originTranslation);
			
				return;
		    }
		
			if(this.autoSlideFinish){
				return;
			}
		
			if(this.cardMovementStarted && this.direction === 1){
				if(event.deltaY >= 10){
				    /*
				     * storing just the value instead of the entire touch object, due to a problem
				     * observed in safari browser in ios. The object seems to be reused for newer touches,
				     * because of which we don't have the old value anymore.
				     */
				    this.newOriginPageY = event.pointers[event.pointers.length - 1].pageY; // new origin
				    this.cardOriginReached = true;
					return;
				}
			
				var distance;
				if(event.deltaY >= 0){
					distance = 100;
				} else {
					distance = 100 - 100 / this.wrapperSize * event.distance;
				}
			
				var newTranslation = { translateZ : '0.1px' };
				newTranslation.translateY = distance + '%';
			
				var cardToMove = this.cards[this.cardToMove];
			
				Velocity(cardToMove, newTranslation);
			
		        return;
		    }
		    
		    var distanceMoved = event.distance;
		    if(this.cardOriginReached){
		        var currentPointer = event.pointers[event.pointers.length - 1];
		        distanceMoved = Math.abs(this.newOriginPageY - currentPointer.pageY);
		    }
		
			this.cardMovementStarted = true;
			this.direction = -1;
		
			var newTranslation = { translateZ : '0.1px' },
				options = {};
		
			if(distanceMoved >= this.options.swipeThreshold){
				// logic to trigger auto slide of card after swiping a set distance
				this.deckEnabled = false;
				this.autoSlideFinish = true;
			
				newTranslation.translateY = '100%';
			
				var context = this;
			
				options.duration = this.computeTransitionDuration(event.deltaTime);
			
				options.complete = function(elements){
					context.updateDeck();
				
					var oldCard = context.options.dataset[context.page+1],
						newCard = context.options.dataset[context.page];
				
					context.options.onCardFlick('backward', oldCard, newCard, context.page, context.dataItemCount);
				};
			} else {
				// logic to continuously move card
				var distance = 100 / this.wrapperSize * distanceMoved;
				newTranslation.translateY = distance + '%';
			}
		
			var cardToMove = this.cards[this.cardToMove];
		
			Velocity(cardToMove, newTranslation, options);
		},
	
		onPanUp : function(event){
			// panup is to view next cards
			if(!this.deckEnabled){
				return;
			}
		
			if((this.page === this.dataItemCount-1) && (!this.cardMovementStarted)){
				// last card in view
				if(event.distance >= this.options.swipeThreshold) {
					// only proceed when swipe threshold is satisfied
					if(this.bottomReached === 0) {
		                this.bottomReached = 1; // update flag to prevent checking multiple times
		                
		                var lastCard = this.options.dataset[this.page];
		                
		                this.options.bottomReached(lastCard);
		            }
				}
		        
		        return;
		    } else {
		        if(this.bottomReached && this.datasetUpdated && this.updateNextCardManually){
		            /*
		             * This scenario is when bottom card is reached and new data is appended to dataset.
		             * In this case, the next card is already rendered with 0th data item, but since new data
		             * is present, further swiping becomes possible again and then, the wrong item is displayed.
		             * To overcome it, update the next card manually with the last index that was supposed to be used.
		             */
		            
		            // nextCardDataIndex will not be undefined if updateNextCardManually is true
		            this.options.onUpdateContent(this.cards[this.nextCard], this.options.dataset[this.nextCardDataIndex]);
		        }
		        
		        this.bottomReached = 0;
		        
		        // reset these flags, since the deck will have been updated with above case or with other swipes
		        this.updateNextCardManually = false;
		        this.datasetUpdated = false;
		    }
		    
		    if(this.isFirstEvent){
		        this.isFirstEvent = false;
		        this.cardMovementStarted = false;
		        this.cardOriginReached = false;
		        
		        this.cardToMove = this.nextCard;
				this.cardToStay = this.currCard;
			
				var cardToStay = this.cards[this.cardToStay];
				Velocity(cardToStay, this.originTranslation);
			
				return;
		    }
		
			if(this.autoSlideFinish){
				return;
			}
		
			if(this.cardMovementStarted && this.direction === -1){
				if(event.deltaY <= -10){
				    /*
				     * storing just the value instead of the entire touch object, due to a problem
				     * observed in safari browser in ios. The object seems to be reused for newer touches,
				     * because of which we don't have the old value anymore.
				     */
				    this.newOriginPageY = event.pointers[event.pointers.length - 1].pageY; // new origin
				    this.cardOriginReached = true;
				    return;    
				}
				
				var distance;
				if(event.deltaY <= 0){
					distance = 0;
				} else {
					distance = 100 / this.wrapperSize * event.distance;
				}
			
				var newTranslation = { translateZ : '0.1px' };
				newTranslation.translateY = distance + '%';
			
				var cardToMove = this.cards[this.cardToMove];
			
				Velocity(cardToMove, newTranslation);
			
		        return;
		    }
		    
		    var distanceMoved = event.distance;
		    if(this.cardOriginReached){
		        var currentPointer = event.pointers[event.pointers.length - 1];
		        distanceMoved = Math.abs(this.newOriginPageY - currentPointer.pageY);
		    }
		    
			this.cardMovementStarted = true;
			this.direction = 1;
		
			var newTranslation = { translateZ : '0.1px' },
				options = {};
			
			if(distanceMoved >= this.options.swipeThreshold){
				// logic to trigger auto slide of card after swiping a set distance
				this.deckEnabled = false;
				this.autoSlideFinish = true;
			
				newTranslation.translateY = 0;
			
				var context = this;
			
				options.duration = this.computeTransitionDuration(event.deltaTime);
			
				options.complete = function(elements){
				    context.updateDeck();
			
					var oldCard = context.options.dataset[context.page-1],
						newCard = context.options.dataset[context.page];
				
					context.options.onCardFlick('forward', oldCard, newCard, context.page, context.dataItemCount);
				};
			} else {
				// logic to continuously move card
				var distance = 100 - 100 / this.wrapperSize * distanceMoved;
				newTranslation.translateY = distance + '%';
			}
		
			var cardToMove = this.cards[this.cardToMove];
		
			Velocity(cardToMove, newTranslation, options);
		},
	
		onPanEnd : function(event){
			// when touch is released
			this.isFirstEvent = true;
		
			if(!this.cardMovementStarted){
				/*
				 * This check is for panend after:
				 * panup when at the last card
				 * or pandown when at the first card
				 */
				return;
			}
		
			this.cardMovementStarted = false;
		
			if(this.autoSlideFinish){
				this.autoSlideFinish = false;
				return;
			}
		
			if(!this.deckEnabled){
				// To eliminate some cases which might accidentally pass the next check when they shouldn't.
				return;
			}
		
			var targetJSC = $(event.target).closest('.jscard')[0];
		
			var currentJSC;
			if(this.direction === 1){
				currentJSC = this.cards[this.cardToStay];
			} else {
				currentJSC = this.cards[this.cardToMove];
			}
		
			if(targetJSC !== currentJSC){
				/* To prevent wrong card display / flashes when arranging cards after auto slide finish.
				 * This is because panEnd events on much earlier swiped cards are being executed after 
				 * auto-slide finishes and newer updated card arranging is done. Even though they are async
				 * and earlier, they seem to wait in the execution stack, until autoslide -> arrange -> update
				 * sequence is finished.
				 */
				return;
			}
		
			/*
			 * TODO : Remove autoSlideFinish logic, and add logic
			 * to check the current card's moved distance to decide
			 * whether to autoslide and finish the remaining distance
			 * or to go back to the card's initial position.
			 */
		
			this.deckEnabled = false;
		
			var context = this;
		
			var newTranslation,
				options = {};
			
			var enableDeckOnComplete = function(elements){
				context.deckEnabled = true;
			};
		
			if(this.direction === 1){
				newTranslation = this.edgeTranslation;
				options.complete = enableDeckOnComplete;
				
				if(event.deltaY < 0){
				    /*
				     * set a transition duration only when the card is still visible
				     * i.e., it has not yet returned to its original position.
				     */
				    options.duration = this.computeTransitionDuration(event.deltaTime);
				}
				
			} else {
				newTranslation = this.originTranslation;
			
				options.complete = function(elements){
					var cardToStay = context.cards[context.cardToStay];
					
					var ctsOptions = {
					    complete : enableDeckOnComplete
					};
					
					Velocity(cardToStay, context.edgeTranslation, ctsOptions);
				};
			
				if(event.deltaY > 0){
					/*
				     * set a transition duration only when the card is still visible
				     * i.e., it has not yet returned to its original position.
				     */
					options.duration = this.computeTransitionDuration(event.deltaTime);
				}
			}
		
			var cardToMove = this.cards[this.cardToMove];
		
			Velocity(cardToMove, newTranslation, options);
		},
	
		computeTransitionDuration : function(deltaTime){
			if(deltaTime < this.options.transitionDurationLT){
				return this.options.transitionDurationLT;
			} else if(deltaTime < this.options.transitionDurationHT) {
				return deltaTime;
			} else {
				return this.options.transitionDurationHT;
			}
		},
	
		updateDeck : function(){
			this.page += this.direction;
			if ( this.page >= this.pageCount ) {
				this.page = 0;
			} else if ( this.page < 0 ) {
				this.page = this.pageCount - 1;
			}

			this.currCard += this.direction;
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

			this.arrangeCards(true);
		},
	
		arrangeCards : function(updateContent){
			var prevCard = this.cards[this.prevCard],
				currCard = this.cards[this.currCard],
				nextCard = this.cards[this.nextCard];
		
		    var context = this;
		    
			var pcaFinished = false,
				ccaFinished = false,
		        ncaFinished = false;
		        
			var pcOptions = {
				    complete : function(elements){
				        pcaFinished = true;
				        
				        if(updateContent && pcaFinished && ccaFinished && ncaFinished){
				            context.updateContent();
				        }
				    }
				},
				ccOptions = {
				    complete : function(elements){
				        ccaFinished = true;
				        
				        if(updateContent && pcaFinished && ccaFinished && ncaFinished){
				            context.updateContent();
				        }
				    }
				},
				ncOptions = {
				    complete : function(elements){
				        ncaFinished = true;
				        
				        if(updateContent && pcaFinished && ccaFinished && ncaFinished){
				            context.updateContent();
				        }
				    }
				};
				
			currCard.style.zIndex = '100';
			Velocity(currCard, this.originTranslation, ccOptions);
		
			Velocity(nextCard, this.edgeTranslation, ncOptions);
			nextCard.style.zIndex = '101';
		
			Velocity(prevCard, this.edgeTranslation, pcOptions);
			prevCard.style.zIndex = '99';
		},
	
		updateContent : function(){
			var newPage = this.page + this.direction,
				cardToUpdate = this.direction > 0 ? this.nextCard : this.prevCard;

			if ( newPage < 0 ) {
				newPage = this.pageCount - 1;
			} else if ( newPage >= this.pageCount ) {
				// set the data index with which nextCard is supposed to be updated.
				this.nextCardDataIndex = newPage;
			
				/*
				 * set flag to indicate that next card will be updated with 0th data item and that
				 * manual update with new data item is needed.
				 */
				this.updateNextCardManually = true;
			
				newPage = 0;
			}
		
			this.options.onDeckUpdated(this.options.dataset, newPage);

			this.options.onUpdateContent(this.cards[cardToUpdate], this.options.dataset[newPage]);
		
			this.deckEnabled = true;
		},
	
		setCardsOrder : function(n){
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
		
			var data = {
				n : n,
				next : next,
				prev : prev
			};
		
			return data;
		},
	
		// For now, this method is used only when initializing the deck
		setCardsContent : function(n, next, prev){
			var ccDataItem = this.options.dataset[n];
			this.options.onUpdateContent(this.cards[this.currCard], ccDataItem);
		
			var ncDataItem = this.options.dataset[next];
			if(ncDataItem === undefined){
				// no data item found with this index
				this.nextCardBlank = true;
			} else {
				this.options.onUpdateContent(this.cards[this.nextCard], ncDataItem);
			}
		
			var pcDataItem = this.options.dataset[prev];
			if(pcDataItem === undefined){
				// no data item found with this index
				this.prevCardBlank = true;
			} else {
				this.options.onUpdateContent(this.cards[this.prevCard], pcDataItem);
			}
		},
	
		goToTop : function(){
			if(this.page === 0){
			    // don't do anything if already on the first page
			    return;
			}
			
			var data = this.setCardsOrder(0);
			this.setCardsContent(data.n, data.next, data.prev);
			this.arrangeCards(false);
			
			this.page = 0; // update the page value
		},
	
		appendData : function(newData) {
			newData = newData || [];
			
			if(this.nextCardBlank){
			    /*
				 * This condition is for handling the following case:
				 * When initializing the deck, if the dataset has only 1 item, then the other 2 cards are blank
				 * and swiping is prevented. But when more data is appended to the dataset, swiping is allowed, and
				 * on swiping to the next card, it will be blank.
				 * Here, it is confirmed that value of this.page is 0, because swiping is prevented when only 1 item
				 * is present and the deck will be at the first card only.
				 */
		        
		        if(newData.length >= 1){
		            // Atleast 1 new data item, next card can be updated immediately.
		            this.options.onDeckUpdated(newData, 0);
		            this.options.onUpdateContent(this.cards[this.nextCard], newData[0]);
		            
		            this.nextCardBlank = false;
		        }
		        
		        if(newData.length >= 2){
		            /*
		             * Atleast 2 new data items, next card was already updated in above condition.
		             * Swiping to next card will automatically update even the blank prev card as normal
		             * flow will be present now.
		             */
		            
		            this.prevCardBlank = false;
		        }
			} else if(this.prevCardBlank){
			    /*
			     * This condition is for handling the following cases:
			     * 1.) In the above if condition, only 1 new data item was present. Then, only the next card was updated
			     *     and prev card is still blank.
			     * 2.) During deck initialization, dataset had only 2 items, so prev card was left blank.
			     */
			     
		        if(newData.length >= 1){
		            /*
		             * Atleast 1 new data item, so prev card can be updated with data based on which
		             * card is currently visible
		             */
		            
		            if(this.page === 0){
		               /*
		                * Deck is still at the first card, no need to manually update the prev card,
		                * because it will be updated in normal flow, when deck is swiped to show next card.
		                */
		            } else if(this.page === 1){
		               /*
		                * Deck was swiped once, and now the next card is visible.
		                * Now update the next card from now with the 1st new data item.
		                */
		                
		                this.options.onDeckUpdated(newData, 0);
		                this.options.onUpdateContent(this.cards[2], newData[0]);
		            }
		            
		            this.prevCardBlank = false;
		        }
			}
			
			// This updates all references to this array, even those outside of this plugin
			this.options.dataset.push.apply(this.options.dataset, newData);
			
			this.recountDataset();
		},
	
		recountDataset : function()	{
			// set flag to indicate dataset is updated
			this.datasetUpdated = true;
			
			// update the no. of items present
			this.dataItemCount = this.options.dataset.length;
			this.pageCount = Math.max(this.dataItemCount, this.options.deckSize);
		},
	
		// This function is for destroying this instance
		destroy : function() {
			if(this.hammeredElement){
			    // unbind all the touch listeners added by hammer
			    this.hammeredElement.destroy();
			}
		}
	};

	return cardView;
}


if ( typeof define === 'function' && define.amd ) {
    // AMD
    define(['Hammer', 'Velocity'], function(Hammer, Velocity){
      return factory(Hammer, Velocity);
    });
} else {
    // browser global
    window.CardView = factory(Hammer, Velocity);
}


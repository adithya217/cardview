# cardview
A javascript plugin for making a list of elements into a swipable set of cards.


This implementation of cardview is a fork of the cardview plugin by cubiq, available at:

https://github.com/cubiq/cardview

The original plugin is quite good, with multiple effects such as slide, rotate and zoom available in horizontal and vertical directions.

This main difference of this implementation with the original is that while the original cardview uses CSS3 transitions, this implementation uses velocity.js as the animation/transition engine and transitions in touchStart and touchMove have been removed.

The reason is that while the original plugin works well when the swipe events occur normally, when the swiping becomes faster, the transitionend
events are not fired correctly, they are even skipped some times. The transition effects become interleaved, causing wrong updates to the deck. This causes the cardDeck to behave as if it is stuck and unresponsive when it is not so. Not good when used in a hybrid mobile app.

Apart from that, I included a few other things I thought would be useful:
1.) Added a method to update the internal card dataset anytime after applying the cardView - useful in ajax implementations
2.) Added callbacks to indicate when first / last cards are reached.
3.) Made loopability of the card deck optional.
4.) Added debouncing of swipe gestures with an optional debounce time interval.
5.) Added a method to goto first card from any point - without the animation, however, for now.
6.) Card transition duration is the time taken to swipe, boxed in an interval that is configurable.

The swipe gestures are recognized and stored to a swipe event list. Card transition and update are invoked via callback from the Velocity engine. That way, even if the browser slows down painting and rendering, the next card transition only happens after the previous transition and update are finished. Meanwhile, any new swipe gestures that arrive are stored in the event list, which is processed in a FIFO manner.

As of now, this is the first version of this implementation and supports only the vertical sliding effect. Remaining effects from the original plugin will be added soon.

A proper guide and documentation will arrive soon, but the API nearly remains the same as in the original plugin with the addition of some new methods and options.

 

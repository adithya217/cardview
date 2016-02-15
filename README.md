# cardview
A javascript plugin for making a list of elements into a swipable set of cards.

This implementation of cardview is a fork of the cardview plugin by cubiq, available at:

https://github.com/cubiq/cardview

The original plugin is quite good, with multiple effects such as slide, rotate and zoom available in horizontal and vertical directions.

### Differences from the original plugin:
* Original cardview uses pure CSS3 transitions via js. This implementation uses velocity.js as the animation/transition engine. JS Transitions help to achieve fine-grained controls with the ability to introduce callbacks at any desired stage of the transition.
* Using Hammer.js for touch events control. It is more efficient and handles nuances/issues on different browsers.

Reason for this shift to js based animation is that while the original plugin works well when the swipe events occur normally, when the swiping becomes faster, the transitionend events are not fired correctly, they are even skipped some times. The transition effects become interleaved, causing wrong updates to the deck. This causes the cardDeck to behave as if it is stuck and unresponsive when it is not so. Not good when used in a hybrid mobile app.

Some other new, useful features:
* Added a method to update the card dataset anytime after applying the cardView - useful in ajax implementations.
* Added callbacks to indicate swiping being done after the first / last cards are reached.
* Made loopability of the card deck optional.
* Added a method to goto first card from any point - without the animation, however, for now.
* Made touch move distance for recognizing configurable.
* Made transition durations and their lower and higher bounds configurable.
* Ability to specify which card of the given dataset to start from.


As of now, this is the first version of this implementation and supports only the vertical sliding effect. Remaining effects from the original plugin will be added soon.

A proper guide and documentation will arrive soon, but the API nearly remains the same as in the original plugin with the addition of some new methods and options.

As of now, this plugin requires Velocity.js, Hammer.js and the jQuery plugins.

### TODO:
* A full-fledged API documentation.
* Links for separately hosted demos.
* Eliminate the remaining usage of jQuery from the plugin.
* Implementation of more effects from the original plugin.
* More feature additions and detected bugfixes to the plugin.


 

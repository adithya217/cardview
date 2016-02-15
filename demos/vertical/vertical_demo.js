
enableCardLayout();

function enableCardLayout()
{
	var $demo = $('#demo');

	var $deck = $('#deck');
	var deck = $deck.get(0);
	
	var $originalItem = $demo.find('.card');
	var $items = [];
	
	// empty the demo container
	$demo.empty();
	
	for(var i=0; i<6; i++){
	    var $tempItem = $originalItem.clone();
        var cardNumber = 'Card ' + i;
        
	    $tempItem.find('.number').html(cardNumber);
	    $items.push($tempItem);
	}
	
	// store the card items
	var $cards = $.makeArray($items);
	
	var cardDeck = new CardView(deck, {
		dataset: $cards,
		swipeThreshold: 60,
		transitionDurationLT: 150,
		onUpdateContent: function(el, data){
			var $this = $(el);
			$this.html(data);
		},
		topReached: function(){
            console.log('Reached top');
		},
		bottomReached: function(){
		    console.log('Reached end');
		}
	});
	
	// show the hidden body, it is hidden by default
	$('body').addClass('fade-in');
}








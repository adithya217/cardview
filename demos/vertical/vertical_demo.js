
enableCardLayout();

function computeCardHeight()
{
    var screenHeight = $(window).height(),
    styleText = '<style type="text/css">.card{ height : ' + screenHeight + 'px!important; }</style>';
    
    $('head').append(styleText);
}

function enableCardLayout()
{
    // to make the card items occupy full screen
	computeCardHeight();
	
	var $demo = $('#demo'),
	$originalItem = $demo.find('.card'),
	$items = [];
	
	// empty the demo container
	$demo.empty();
	
	for(var i=0; i<6; i++){
	    var $tempItem = $originalItem.clone(),
	        cardNumber = 'Card ' + i;
	    $tempItem.find('.number').html(cardNumber);
	    $items.push($tempItem);
	}
	
	// store the card items
	var $cards = $.makeArray($items);
	
	var cardDeck = new CardView('body', {
		effect : 'slide',
		direction : 'v',
		dataset: $cards,
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
	$('body').show();
	
	// add some cards on the fly, after applying card view, for stress testing how the UI thread fares
	var newCards = [];
	for(var i=6; i<100; i++){
	    var $tempItem = $originalItem.clone(),
	        cardNumber = 'Card ' + i;
	    $tempItem.find('.number').html(cardNumber);
	    newCards.push($tempItem);
	}
	
	newCards = $.makeArray(newCards);
	cardDeck.updateDataset(newCards);
}








var initDB = function(db){
	ContactsDB = db; INDB = {}; LOCDB = {};
	
	_.each(db, function(e,i){
		var ind = e.industry ? e.industry.split(', ') : [];
		var loc = e.location ? e.location.split(', ') : [];
		var id = e._id;
		var n = e.name;
		ind.forEach(function(x){
			var e = x.toLowerCase();
			if(!INDB[e]) INDB[e] = [];
			INDB[e].push({name: n, id: id})
		})
		loc.forEach(function(x){
			var e = x.toLowerCase();
			if(!LOCDB[e]) LOCDB[e] = [];
			LOCDB[e].push({name: n, id: id});
		})		
	});

	var S = $('.sidebar');
	
	if(S.length){
		$('.locs').hide();$('.indii').hide();
		Object.keys(LOCDB).forEach(function(e){
			$('.locs').append('<li><a class="loki" id='+e.replace(/\s/g, '_' )+' href="#people">' + e +'</a></li>')
		})
		Object.keys(INDB).forEach(function(e){
			$('.indii').append('<li><a class="index" id='+e.replace(/\s/g, '_' )+' href="#people">' + e +'</a></li>')
		})
	}
	
	$('.dropdown').click(function(){
		$(this).siblings().slideToggle()
	})
	
	$('#showall').click(function(){
		$('.peoplink').show();
	})
	
	$('.index').click(function(e){
		var id = this.id.replace(/_/g, ' ');
		$('.peoplink').hide();
		_.each(INDB[id], function(e){
			$('#' + e.id).show();
		})
	});
		
	$('.loki').click(function(e){
		var id = this.id.replace(/_/g, ' ');
		$('.peoplink').hide();
		_.each(LOCDB[id], function(e){
			$('#' + e.id).show();
		})
	})
};

var GO = function(){
	
	$.getJSON('/contactsDB', function(d){
		initDB(d)
	})
	
	$('.entry')
		.attr('contenteditable', 'true' )
		.focus(function(e){
			$(this).bind('keyup', function(){
				var id = this.parentNode.parentNode.parentNode.id;
				var node = this.parentNode.id;
				var data = this.textContent;
				console.log(node, id, data);
				$.post('/profile', {id: id, node: node, data: data}, function(e,r,b){					
				})
			})
		})
		.blur(function(e){
			$(this).unbind('keyup')
		})
		
		if($('.sidebar').length){
			
		}
	
}

$(document).ready(GO)
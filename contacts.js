var _ = require('underscore')
	,	fs = require('fs')
	,	hash = require('./node_modules/hashlib/build/Release/hashlib').hmac_sha1
	,	spice = 'coonhound'
	, utils = require('util')
;
		
var ContactsDB = Object.create(null), 
		Contacts = fs.readdirSync('contacts');
var D = fs.readFileSync('contacts/.deleted.json', 'utf8');
var Deleted = JSON.parse(D);
var industriiDB = [];		
var networks = [
	'facebook',
	'twitter',
	'gcontacts',
	'github',
	'linkedin',
	'tumblr'
];

var reloadDB = function(){
	Contacts = fs.readdirSync('contacts');
	Contacts.forEach(function(p){
		try {
			var d = JSON.parse(fs.readFileSync('contacts/' + p, 'utf8'));
			if(!d.hidden){
				ContactsDB[p] = d;			
			}
			else return;
		}
		catch(err){
			console.log('error' + p)
		}
	});
}

var N =  Object.create(null);

networks.forEach(function(e){N[e] = {networkID : '', networkProfile: ''}; return});

Contacts.forEach(function(p){
	try {
		var d = JSON.parse(fs.readFileSync('contacts/' + p, 'utf8'));
		if(!d.hidden){
			ContactsDB[p] = d;			
		}
		else return
	}
	catch(err){
		console.log('error' + p)
	}
});

var checkDeleted = function(id){
	if(_.contains(Deleted, id)) return true;
	return false;
}
;
//exports.industriiDB = _.uniq(_.flatten(industriiDB))
exports.ContactsDB = ContactsDB;


exports.update = function(data){
	ContactsDB[data.id][data.node] = data.data;
	fs.writeFileSync('contacts/' + data.id, JSON.stringify(ContactsDB[data.id]), 'utf8')
};

exports.hide = function(id){
	ContactsDB[id].hidden = true;
	fs.unlink('contacts/' + id);
	fs.writeFile('contacts/.' + id, JSON.stringify(ContactsDB[id]), 'utf8', function(){
		delete ContactsDB[id];
		reloadDB();
	})
};

exports.Delete = function(id){
	if(!id){return};
	fs.unlink('contacts/' + id, function(e){
		if(e){console.log(e); return};
		Deleted.push(id);
		Contacts = fs.readdirSync('contacts');
		fs.writeFileSync('contacts/.deleted.json', JSON.stringify(Deleted), 'utf8');
	})
};

exports.CreateContact = function(data, network, cb){
	
	console.log(network)
	
	this.latlong = [];
	this.channels = [];
	this.phone = 5555555;
	this.aliases = [];
	this.websites = '';
	this.time_zone = '';
	this.hidden = false;
	this.industry = '';
	this.networks = {};	
	this.networks[network] = {};
	this.networks[network].name = network;
	this.networks[network].id = data.data.id ? data.data.id : data.map.id ? data.map.id : Contacts.length + Date().getTime();
	this.networks[network].profile = data.map.oembed.url || 'add link to profile';
	this.name = data.map.oembed.title || data.map.nickname;
	this.pic = data.map.photo || 'images/dummy.png';
	this.thumb = data.map.thumbnail_url || '../images/dummy.png';
	this.description = data.map.text || '';
	this.email = data.map.email || 'add email address';
	this._id = hash((Contacts.length + new Date().getTime()).toString(), spice);
	this.websites = data.data.url;

	switch (typeof data.data.location)
	{
		case 'string':
			this.location = data.data.location
		break;
		case 'object':
			this.location = data.data.location ? data.data.location.name : ''
		break;
		default:
			this.location = '';
		break;
	}
	
	switch (network.toLowerCase())
		{
			case 'facebook':
				this.employer = data.data.work ? data.data.work[0].employer.name : 'enter employer';
				this.work = data.data.work ? data.data.work[0].position.name : 'enter work info';
			break
			;
			case 'gcontacts':

				if(this.email && this.email.toLowerCase().indexOf('craigslist.org') > 0) return false;
				this.email = data.map.oembed.email;
				this.phone = data.data.gd$phoneNumber ? data.data.gd$phoneNumber.$t : 'enter phone number';
			break
			;
			case 'twitter':
			break
			;
			case 'github':
				this.email = data.data.email || undefined;
				if(data.data.blog) this.websites = data.data.blog + ', ' + data.data.url || '';
			break
			;
			case 'instagram':
			break
			;
			case	'foursquare':
			break
			;
			case 'linkedin':
				this.employer = data.data.work.employer.name || undefined;
				this.work = data.data.headline || undefined;
				this.pic = data.data.pictureUrl || '../images/dummy.png';
			break
			;
			case ' tumblr':
				this.description = '';
			break
			;
			default:
			break
			;			
		}

		var that = this;
		ContactsDB[this._id] = that;
		cb(null, that)
	};

exports.Channel = function(channel){
	
}
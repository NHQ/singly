var express = require('express');
var querystring = require('querystring');
var request = require('request');
var sprintf = require('sprintf').sprintf;
var OAuth2 = require('oauth').OAuth2;
var cr = require('connect-redis');
var RedisStore = require('connect-redis')(express);
var Contacts = require('./contacts.js'); 
var fs = require('fs');
var apiBaseUrl = process.argv[5] || 'https://api.singly.com';
var _ = require('underscore');

// The port that this express app will listen on
var port = 3444;
var hostBaseUrl = 'http://localhost' || 'http://74.207.246.247:' + port;

// Your client ID and secret from http://dev.singly.com/apps
var clientId = process.argv[2] || '';
var clientSecret = process.argv[3] || '';

console.log(clientId)

// Pick a secret to secure your session storage
var sessionSecret = '42';

var usedServices = [
   'Facebook',
   'foursquare',
   'Instagram',
   'Tumblr',
   'Twitter',
   'LinkedIn',
   'FitBit',
   'github',
   'gcontacts',
   'Email'
];

var sCon = [
	'facebook/friends',
	'twitter/friends',
	'gcontacts/contacts',
	'github/following',
	'linkedin/connections',
	'tumblr/following'
];

var oa = new OAuth2(clientId, clientSecret, apiBaseUrl);

// A convenience method that takes care of adding the access token to requests
function getProtectedResource(path, session, callback) {
   oa.getProtectedResource(apiBaseUrl + path, session.access_token, callback);
}

// Given the name of a service and the array of profiles, return a link to that
// service that's styled appropriately (i.e. show a link or a checkmark).
function getLink(prettyName, profiles, token) {
   var service = prettyName.toLowerCase();

   // If the user has a profile authorized for this service
   if (profiles && profiles[service] !== undefined) {
      // Return a unicode checkmark so that the user doesn't try to authorize it again
      return sprintf('<span class="check">&#10003;</span> <a href="%s/services/%s?access_token=%s">%s</a>', apiBaseUrl, service, token, prettyName);
   }

   // This flow is documented here: http://dev.singly.com/authorization
   var queryString = querystring.stringify({
      client_id: clientId,
      redirect_uri: sprintf('%s/callback', hostBaseUrl),
      service: service
   });

   return sprintf('<a href="%s/oauth/authorize?%s">%s</a>',
      apiBaseUrl,
      queryString,
      prettyName);
}

// Create an HTTP server
var app = express.createServer();

// Setup for the express web framework
app.configure(function() {
   app.use(express.static(__dirname + '/public'));
   app.use(express.bodyParser());
   app.use(express.cookieParser());
   app.use(express.session({ store: new RedisStore, secret: 'keyboard cat' }));
   app.use(app.router);
   app.use(require('stylus').middleware({ src: __dirname + '/public' }));
});

// We want exceptions and stracktraces in development
app.configure('development', function() {
   app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
   }));
});

// ... but not in production
app.configure('production', function() {
   app.use(express.errorHandler());
});

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/update', function(req, res){
	if(!req.session.profiles) res.redirect('/');
	
	var str = {
		access_token : req.session.access_token,
		limit : 500,
		map: true
	};

	var n = 0;
	var getContacts = function(e){
		
		var r = request.get({
			uri: apiBaseUrl + '/services/' + e + '?' + querystring.stringify(str)
		}, function(er, r, b){
			try{
				data = JSON.parse(b);			
				data.forEach(function(c){
					var contact = new Contacts.CreateContact(c, e.slice(0, e.indexOf('/')), function(e, x){fs.writeFileSync('contacts/' + x._id, JSON.stringify(x), 'utf8')});
				})
			}
			catch(err){
				console.log(err)
			}
		});

		r.on('end', function(){
			if(++n < sCon.length){
				getContacts(sCon[n])			
			}
			else res.redirect('/people');
		});
	}
	
	getContacts(sCon[n]);
					
});

app.get('/', function(req, res) {

   var i;
   var services = [];

   // For each service in usedServices, get a link to authorize it
   for (i = 0; i < usedServices.length; i++) {
      services.push({
         name: usedServices[i],
         link: getLink(usedServices[i], req.session.profiles, req.session.access_token)
      });
   }

   // Render out views/index.ejs, passing in the array of links and the session
   res.render('index', {
      services: services,
      session: req.session
   });
});

app.get('/callback', function(req, res) {
   var data = {
      client_id: clientId,
      client_secret: clientSecret,
      code: req.param('code')
   };

   request.post({
      uri: sprintf('%s/oauth/access_token', apiBaseUrl),
      body: querystring.stringify(data),
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded'
      }
   }, function (err, resp, body) {
      try {
         body = JSON.parse(body);
      } catch(parseErr) {
         return res.send(parseErr, 500);
      }

      req.session.access_token = body.access_token;

      getProtectedResource('/profiles', req.session, function(err, profilesBody) {
         try {
            profilesBody = JSON.parse(profilesBody);
         } catch(parseErr) {
            return res.send(parseErr, 500);
         }

         req.session.profiles = profilesBody;

         res.redirect('/');
      });
   });
});
app.get('/people', function(req, res){
	var people = _.map(Contacts.ContactsDB, function(e,i){
		return {name: e.name, id: e._id}
	})
	res.render('people', {people: people})
});

app.get('/person/:id', function(req, res){
	var person = Contacts.ContactsDB[req.params.id];
	if (!person){res.redirect('/people')}
	else
		res.render('person', {person: person});
});
app.post('/profile', function(req, res){
	Contacts.update(req.body);
//	console.log(Contacts.ContactsDB[req.body.id]);
	res.writeHead('201');
	res.end();
});

app.get('/contactsDB', function(req, res){
	res.setHeader('Content-Type', 'application/json');
	res.write(JSON.stringify(Contacts.ContactsDB));
	res.end();
})

app.get('/todo', function(req, res){
	res.render('todo')
})
app.get('/hide/:id', function(req, res){
	Contacts.hide(req.params.id);
	res.redirect('/people')
})
app.listen(port);

console.log(Object.keys(Contacts.ContactsDB).length)


console.log(sprintf('Listening at %s using API endpoint %s.', hostBaseUrl, apiBaseUrl));

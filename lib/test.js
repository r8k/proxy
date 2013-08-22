exports.initTestServer = function() {
	var testServer = http.createServer();
	testServer.port = config.testserverport;
	testServer.name	= 'TestServer';

	testServer.on('request', function (req, res) {
		var body = "";
		
		req.on('data', function (chunk) {
			body += chunk;
		});
		
		req.on('end', function () {
			log.debug('POSTed: ' + body);
			res.writeHead(200);
			res.end(body+'\n');
		});
	});

	return testServer;
};
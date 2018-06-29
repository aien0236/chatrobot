var restify = require('restify');
var builder = require('botbuilder');
var request = require('request')

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || '3978', function () {
    console.log('%s listening to %s', server.name, server.url)
});

var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
});

server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, function (session) {
    // 取值
    var id = session.message.text;
    // request設定
    var options = {
        method: 'GET',
        url: "http://localhost:8000/api/v1/group/"
    }
    // 打request出去
    request(options, function (error, response, body) {
        // 資料處理，較好的做法是在server端做完，再用api過濾，但未完成REST API的建置，暫時只有簡單版。
        var employees = JSON.parse(body);
        console.log(employees);
        for(i=0; i< employees.length; i++) {
            if (employees[i].pk == id) {
                session.endDialog(`The employees' name(${id}) is: ${employees[i].fields.lastname}<br/>First name: ${employees[i].fields.firstname}<br/>Titleofcourtesy: ${employees[i].fields.titleofcourtesy}<br/>Address: ${employees[i].fields.address}<br/>Homephone: ${employees[i].fields.homephone}<br/>Notes: ${employees[i].fields.notes}`);
            }
        }
        session.endDialog("No such a employee in db.");
    });
});
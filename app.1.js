var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');
var querystring = require('querystring');

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
    session.send('System online');
    session.replaceDialog('mainMenu');

    // var id = session.message.text;
    // var options = {
    //     method: 'GET',
    //     url: 'http://localhost:8000/api/v1/group/'
    // }
    // request(options, function (error, response, body) {
    //     // console.log(body)
    //     var employees = JSON.parse(body);
    //     // console.log(employees[i]);
    //     for (i = 0; i < employees.length; i++) {
    //         console.log(employees[i]);
    //         if (employees[i].employeeid == id) {
    //             session.endDialog(`${employees[i].employeeid}<br/>${employees[i].fields.lastname}<br/>${employees[i].fields.firstname}<br/>${employees[i].fields}<br/>`)
    //             break;
    //         }
    //     }
    //     session.endDialog("Error")
    // })
});

bot.dialog('mainMenu', [
    function (session) {
        // session.dialogData.identification={};
        builder.Prompts.number(session, "Welcom to the UMF manage system. Please let me check your identification.");
    },
    function (session, results) {
        var pwd = results.response;
        var options = {
            method: 'GET',
            url: 'http://localhost:8000/api/v1/group/'
        }
        request(options, function (error, response, body) {
            // console.log(body)
            var employees = JSON.parse(body);
            var confirmed = 0;
            console.log(employees[0].pk);
            for (i = 0; i < employees.length; i++) {
                // console.log(employees[i]);
                if (employees[i].fields.postalcode == pwd) {
                    session.send("Identity confirmed");
                    session.send(`Welcome aboard, ${employees[i].fields.titleofcourtesy} ${employees[i].fields.firstname} ${employees[i].fields.lastname}`);
                    if (employees[i].pk == 2) {
                        builder.Prompts.choice(session, "Here are the authorities you have.", "Task management|Function2|Function3|Function4", { listStyle: builder.ListStyle.button });
                    } else if (employees[i].pk == 5) {
                        builder.Prompts.choice(session, "Here are the authorities you have.", "Task management|Function2|Function3|Function4", { listStyle: builder.ListStyle.button });
                    } else {
                        builder.Prompts.choice(session, "Here are the authorities you have.", "Task management|Function2|Function3|Function4", { listStyle: builder.ListStyle.button });
                    }
                    var confirmed = 1;
                    break;
                }
            }
            if (!confirmed) {
                session.endDialog("Authentication failed.");
            }
            // console.log(employees[0].employeeid);
            session.userData.identity = employees[i].pk;
            console.log("id is:" + session.userData.identity);
        })
    },
    function (session, results) {
        var choice = results.response.entity;
        console.log("id is:" + session.userData.identity);
        session.replaceDialog(choice);
    }
]);

bot.dialog('Task management', [
    function (session) {
        builder.Prompts.choice(session, "Select a function below.", "Clock-in & Daily Plan|Work Time Confirmation|Work Reports|Efficiency Report", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        var choice = results.response.entity;
        session.replaceDialog(choice);
    }
]);

bot.dialog('Work Reports', [
    function (session) {
        var options = {
            method: 'GET',
            url: 'http://localhost:8000/api/v1/group/'
        }
        request(options, function (error, response, body) {
            var employees = JSON.parse(body);
            var id = session.userData.identity;
            for (i = 0; i < employees.length; i++) {
                if (employees[i].fields.reportsto == id) {
                    session.send(`${employees[i].fields.titleofcourtesy} ${employees[i].fields.firstname} ${employees[i].fields.lastname}  :<br/>${employees[i].fields.notes}`);
                }
            }
            builder.Prompts.text(session, "Assign jobs?");
        })
    },
    function (session, results) {
        if (results.response == 'Assign jobs' || results.response == 'Assign job' || results.response == 'y' || results.response == 'yes') {
            session.replaceDialog('assign jobs');
        }
    }
]);

bot.dialog('assign jobs', [
    function (session) {
        builder.Prompts.text(session,'To who?');
    },
    function (session, results) {
        var userid = session.userData.identity;
        var name = results.response;
        var options = {
            method: 'GET',
            url: 'http://localhost:8000/api/v1/group/'
        }
        request(options, function (error, response, body) {
            var employees = JSON.parse(body);

            for (i = 0; i < employees.length; i++) {
                console.log("in");
                if (employees[i].fields.lastname == name || employees[i].fields.firstname == name) {
                    console.log("in");

                    builder.Prompts.text(session,`What do you want ${employees[i].fields.titleofcourtesy} ${employees[i].fields.firstname} ${employees[i].fields.lastname} to do?`);
                    session.userData.employeeid = employees[i].pk;
                    session.userData.titleofcourtesy = employees[i].fields.titleofcourtesy;
                    session.userData.firstname = employees[i].fields.firstname;
                    session.userData.lastname = employees[i].fields.lastname;
                }
            }
        })
    },
    function (session, results) {
        var jobs = results.response;
        var employeeid= session.userData.employeeid;
        var titleofcourtesy= session.userData.titleofcourtesy;
        var firstname= session.userData.firstname;
        var lastname= session.userData.lastname;
        var form= { 'employeeid': employeeid, 'job': jobs };
        var formData= querystring.stringify(form);
        var options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
            body: formData,
            url: 'http://localhost:8000/api/v1/group/'
        }
        request(options,function(error, response, body){
            builder.Prompts.text(session,`Confirmed, set job to ${titleofcourtesy} ${firstname} ${lastname} as below: ${jobs}`)
        })
        // break;
    },
    function(error, response, body){
        session.endDialog("Done")
        // session.replaceDialog("")
    }
])
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
    session.replaceDialog('Login');
});

bot.dialog('Login',[
        function (session,args) {
            var prompText;
            if (args == "failed"){
                promptText= "Please try again.";
            }else{
                var promptText= "Welcom to the UMF manage system. Please let me check your identification.";
            }
            builder.Prompts.text(session, promptText);
        },
        function (session, results) {
            var pwd = results.response;
            var options = {
                method: 'GET',
                url: 'http://localhost:8000/api/employees/'
            };
            request(options, function (error, response, body) {
                var employees = JSON.parse(body);
                var confirmed = 0;
                console.log(employees[0].employeeid);
                for (i = 0; i < employees.length; i++) {
                    if (employees[i].postalcode == pwd) {
                        session.send("Identity confirmed");
                        session.send(`Welcome aboard, ${employees[i].titleofcourtesy} ${employees[i].firstname} ${employees[i].lastname}`);
                        if (employees[i].employeeid == 2) {
                            builder.Prompts.choice(session, "Here are the authorities you have.", "Task management|Function2|Function3|Function4", { listStyle: builder.ListStyle.button });
                        } else if (employees[i].employeeid == 5) {
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
                    session.replaceDialog("Login","failed");
                }else{
                session.userData.identity = employees[i].employeeid;
                }
            })
        },
        function (session, results) {
            var choice = results.response.entity;
            session.replaceDialog(choice);
        }
])

bot.dialog('Main menu',[
    function(session){
        var identity= session.userData.identity;
        if (identity == 0) {
            session.replaceDialog("Login")
        } else if (identity == 2) {
            builder.Prompts.choice(session, "Here are the authorities you have.", "Task management|Function2|Function3|Function4", { listStyle: builder.ListStyle.button });
        } else if (identity == 5) {
            builder.Prompts.choice(session, "Here are the authorities you have.", "Task management|Function2|Function3|Function4", { listStyle: builder.ListStyle.button });
        } else {
            builder.Prompts.choice(session, "Here are the authorities you have.", "Task management|Function2|Function3|Function4", { listStyle: builder.ListStyle.button });
        }
    },
    function (session, results) {
        var choice = results.response.entity;
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
            url: 'http://localhost:8000/api/employees/'
        };
        request(options, function (error, response, body) {
            var employees = JSON.parse(body);
            var id = session.userData.identity;
            for (i = 0; i < employees.length; i++) {
                if (employees[i].reportsto == id) {
                    session.send(`${employees[i].titleofcourtesy} ${employees[i].firstname} ${employees[i].lastname}  :<br/>${employees[i].notes}`);
                }
            }
            builder.Prompts.choice(session, "Assign jobs?","Assign jobs|Main menu|Task management",{ listStyle: builder.ListStyle.button });
        })
    },
    function (session, results) {
        var choice = results.response.entity;
        session.replaceDialog(choice);
    }
]);

bot.dialog('Assign jobs', [
    function (session, results) {
        var userid = session.userData.identity;
        // var name = results.response;
        var options = {
            method: 'GET',
            url: 'http://localhost:8000/api/employees/'
        };
        request(options, function (error, response, body) {
            var employees = JSON.parse(body);
            session.dialogData.members= new Array();
            session.dialogData.membersid= new Array();
            for (i = 0; i < employees.length; i++) {
                if (employees[i].reportsto == userid) {
                    var membersid= employees[i].employeeid;
                    var member = employees[i].titleofcourtesy +" "+ employees[i].firstname +" "+ employees[i].lastname;
                    session.dialogData.membersid.push(membersid);
                    session.dialogData.members.push(member);
                }
            }
            var members= session.dialogData.members;
            builder.Prompts.choice(session,'To who?',members,{ listStyle: builder.ListStyle.button });
        })
    },
    function(session,results){
        var member= results.response.entity
        session.dialogData.memberid= session.dialogData.membersid[results.response.index];
        builder.Prompts.text(session,`What do you want ${member} to do?`);
    },
    function (session, results) {
        var jobs = results.response;
        var employeeid= session.dialogData.memberid;
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
            url: 'http://localhost:8000/api/employeestask/'
        };
        request(options,function(error, response, body){
            builder.Prompts.choice(session,`Confirmed, set job to ${titleofcourtesy} ${firstname} ${lastname} as below: <br/>${jobs}`,"Work Reports|Task management|Main menu|Log out",{ listStyle: builder.ListStyle.button });
        })
    },
    function (session, results) {
        var choice = results.response.entity;
        session.replaceDialog(choice);
    }
])

bot.dialog("Log out",function(session){
    session.userData.identity=0;
    session.replaceDialog("Login");
})
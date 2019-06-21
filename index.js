console.log("Listening at localhost:5000")
const express = require('express');
const app = express();
const multer=require('multer');
var legit;
var user;
var tableName;
app.use(express.static('public'));//any static files must be served from this directory
app.use(express.urlencoded());//allows for params from forms to be passed by using req.body.<name attribute from desired input from form>
app.use(express.json()); // support json encoded bodies(not used here)
const fs = require('fs');//won't need when wired up to db

app.set('view engine','pug');//lets us use pug templating
app.set('views','./views');//sets the directory for the pug files

var sqlite3 = require('sqlite3');
let db = new sqlite3.Database('nodebook_db.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the in-memory SQlite database.');
});

db.run(`CREATE TABLE IF NOT EXISTS users(
  username string,
  password password
)`)

app.post('/checkCred',function(req,res){
  db.get(`SELECT password FROM users WHERE username=(?)`,[req.body.user1],(err,rows)=>{
    if(rows && req.body.password==rows.password){
      legit=true;
      user=req.body.user1
      res.redirect('/home');
    }else{
      res.render("login.pug",{
      text:"wrong username or password--try again, or create an account!",
      })
    }
  });
});

app.post('/createAccount',function(req,res){
  db.run(`INSERT INTO users(username,password) VALUES(?,?);`,[req.body.username,req.body.password],function(err,rows){
    console.log(`account created with username ${req.body.username}`)
  });

  //Create the tables in db to hold log entries and dates
  const TABLES=["helloLog","codeLog","readingLog","carvingLog","movementLog","musicLog","cookingLog","drawingLog"]//will need to make this update dynamically in next version (as user can add/delete/edit notebook tabs)
  TABLES.forEach(function(item,index){
    tableName=`${req.body.username}`+"_"+`${item}`
    console.log(`tableName is ${tableName}`)
    let makeTable=`CREATE TABLE IF NOT EXISTS ${tableName}(
      id INTEGER PRIMARY KEY NOT NULL,
      date datetime,
      entry mediumtext
    )`
    db.run(makeTable);
  })
  legit=true;
  user=req.body.username
  res.redirect('/home');
});

app.get('/',function(req,res){
  legit=false;
  res.render('login.pug');
})

app.get('/home',function(req,res){
  if(legit){
    res.render('home.pug');
  }else{
    res.render('login.pug');
  }
})

app.post("/delete",function(req,res){
  console.log(req.body)
  if(Object.keys(req.body).length>0){//if the box is checked, the name of the box (which is taken from the db row number) becomes a key in the req.body object.  if not checked, the object is empty
    let rowId=Object.keys(req.body)[0]//checkbox name attribute which was set to the db row id in the app.get(:section) route
    let query=`DELETE FROM ${tableName} WHERE id=(?)`
    db.run(query,[rowId],function(err,rows){
      if (err){
        console.log("We've encountered a problem" + err.message)
      }else{
        console.log("post deleted")
      }
    })
  }else{
    console.log("not there")
  };
   res.redirect(`${Object.keys(req.body)[1]}`)
})

app.post("/update",function(req,res){
  console.log(req.body)
  if(Object.keys(req.body).length>0){//if the box is checked, the name of the box (which is taken from the db row number) becomes a key in the req.body object.  if not checked, the object is empty
    let rowId=Object.keys(req.body)[0]//checkbox name attribute which was set to the db row id in the app.get(:section) route
    let query=`UPDATE ${tableName} SET date="${req.body.newDate}", entry="<h2>${req.body.newEntry}</h2>" WHERE id=(?) `
    db.run(query,[rowId],function(err,rows){
      if (err){
        console.log("We've encountered a problem" + err.message)
      }else{
        console.log("post updated")
      }
    })
  }else{
    console.log("not there")
  };
   res.redirect(`${Object.keys(req.body)[1]}`)
})


  // <input type="checkbox" name=${row.id}>  FROM LiNE 133

  app.get("/:section",function(req,res){
    if(legit){
      let entry=""
      tableName=`${user}` + "_" +`${req.params.section}`
      console.log("just checking " +  req.params.section + " and user is " + `${user}` +" and tableName is "+ `${tableName}`)
      db.all(`SELECT * FROM ${tableName};`,[],(err,rows)=>{
        if(rows){
          rows.forEach((row)=>{
            entry+=`
            ${row.date}
            ${row.entry}
            <form action="/delete" method="POST" id="form1">
            <input type="text" name=${req.params.section} style="display:none;">
            <input type="text" name=${row.id} style="display:none;">
            <button type="submit">Delete</button>
            </form>

            <form action="/update" method="POST" id="form2">
            <input type="text" name=${req.params.section} style="display:none;">
            <input type="text" name=${row.id} style="display:none;">
            <input type="text" name="newDate">
            <input type="text" name="newEntry">
            <button type="submit">Update</button>
            </form>
            <br>
            `
          })
          res.render('viewPage.pug',{
            heading:`${req.params.section}`,
            text:`${entry}`,
          })
        }
        res.render(`${req.params.section}`+ ".pug")
      })
    }else{
      res.render('login.pug');
    }
  });

app.post("/:section",function(req,res){
  createPost(`${req.params.section}`,req,res);
});

function getDate(){
  var now=new Date();
  var hour=Number(now.getUTCHours())-4;
  var minutes=now.getUTCMinutes();
  var dayPart;
  if(hour>12){
    hour-=12;
    dayPart="PM";
  }else if(hour<=0){
    hour<0?dayPart="PM":dayPart="AM";
    hour+=12;
  }else{
    hour==12?dayPart="PM":dayPart="AM";
  }
  return time = now.toDateString() + " " + String(hour) + ":" + minutes + " " + dayPart;
}

function createPost(section,req,res){
  console.log(`for some reason, in createPost, tableName is ${tableName}`)
  let date=getDate();
  console.log(`posting from ${section}!`)
  tableName=`${user}` + "_" + `${section}`
  let sql=`INSERT INTO ${tableName} (entry,date) VALUES (?,?);`

  db.run(sql,[`<br><h2>${req.body.comment}</h2>`,date], function(err) {
    if (err) {
      return console.log(err.message);
    }
    res.render('home.pug')
  });
}
app.listen(5000);

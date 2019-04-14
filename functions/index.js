const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
var cors = require("cors");
const express = require("express");
const engines = require("consolidate");
const ui = express();
const api = express();

const util = require("util");

var bodyParser = require("body-parser");

// --- UI Rendering ----
ui.engine("hbs", engines.handlebars);
ui.set("views", "./public/views");
ui.set("view engine", "hbs");
ui.use(express.static(__dirname + "/public"));

ui.get("/", (request, response) => {
  response.render("home");
});

ui.get("/login", (request, response) => {
  response.render("login");
});

ui.get("/profile", (request, response) => {
  response.render("profile");
});

ui.get("/questions/:pastPaperId", (request, response) => {
  var pastPaperId = request.params.pastPaperId;
  response.render("questions", { pastPaperId: pastPaperId });
});

ui.get("/questions", (request, response) => {
  response.render("questions");
});

ui.get("/question", (request, response) => {
  response.render("question");
});

ui.get("/admin", (request, response) => {
  response.render("admin");
});

exports.ui = functions.https.onRequest(ui);

// --- API ----
api.use(bodyParser.urlencoded({ extended: false }));
api.use(bodyParser.json());
// var corsOptions = {
//     origin: 'http://localhost:5010',
//     optionsSuccessStatus: 200
// }
// api.use(cors);

/**
 Create a new entry for the item specified. A primary key will be generated by the database
 */
async function save(request, response, path) {
  return admin
    .database()
    .ref(path)
    .push(request.body)
    .then(snapshot => {
      console.log("Successfully posted item with ref ---" + snapshot.ref);
      const responseBody = {
        key: snapshot.key,
        ref: snapshot.ref
      };
      return response.json(responseBody);
    });
}

function findByColumn(request, response, parentPath, columnName, columnValue) {
  var objectList = [];
  return admin
    .database()
    .ref(parentPath)
    .orderByChild(columnName)
    .equalTo(columnValue)
    .once(
      "value",
      function(data) {
        data.forEach(function(childData) {
          const responseBody = {
            key: childData.key,
            data: childData.val()
          };
          objectList.push(responseBody);
        });
        return response.json(objectList);
      },
      function(errorObject) {
        console.log("Read failed: " + errorObject.code);
      }
    );
}

function findAll(request, response, path) {
  var objectList = [];
  return admin
    .database()
    .ref(path)
    .once(
      "value",
      function(data) {
        data.forEach(function(childData) {
          const responseBody = {
            key: childData.key,
            data: childData.val()
          };
          objectList.push(responseBody);
        });
        return response.json(objectList);
      },
      function(errorObject) {
        console.log("Read failed: " + errorObject.code);
      }
    );
}

function findToALimit(request, response, path, limit) {
  var objectList = [];
  return admin
    .database()
    .ref(path)
    .limitToFirst(limit)
    .once(
      "value",
      function(data) {
        data.forEach(function(childData) {
          const responseBody = {
            key: childData.key,
            data: childData.val()
          };
          objectList.push(responseBody);
        });
        return response.json(objectList);
      },
      function(errorObject) {
        console.log("Read failed: " + errorObject.code);
      }
    );
}

function findById(request, response, path) {
  return admin
    .database()
    .ref(path)
    .once(
      "value",
      function(data) {
        console.log("Returning item with given ID" + data);
        const responseBody = {
          key: data.key,
          data: data.val()
        };
        return response.json(responseBody);
      },
      function(errorObject) {
        console.log("The read failed: " + errorObject.code);
      }
    );
}

function checkExists(request, response, path, secondaryPath) {
  return admin
    .database()
    .ref()
    .child(path)
    .child(secondaryPath)
    .once(
      "value",
      function(data) {
        const responseBody = {
          exists: data.val() !== null
        };
        return response.json(responseBody);
      },
      function(errorObject) {
        console.log("Failed to check if user exists: " + errorObject.code);
      }
    );
}

// /**
//  Create a new entry for the item specified where the primary key is not generated by the database. Primary key should be
//  supplied in the path
//  */
// function set(request, response, path, body) {
//     console.log("posting with data ---" +request);
//     return admin.database().ref(path).push(body).then((snapshot) => {
//         console.log("Successfully posted item with ref ---" +snapshot.ref);
//         const responseBody = {
//             "key": snapshot.key,
//             "ref": snapshot.ref
//         };
//         return response.json(responseBody);
//     });
//
// }

/**
 *
 */
function update(request, response, path, body) {
  console.log("updating with data ---" + request.body);
  return admin
    .database()
    .ref(path)
    .update(body)
    .then(snapshot => {
      const responseBody = {
        status: "success"
      };
      return response.json(responseBody);
    });
}

function deleteById(request, response, path) {
  return admin
    .database()
    .ref(path)
    .remove()
    .then(() => {
      const responseBody = {
        status: "OK"
      };
      return response.json(responseBody);
    });
}

// --- USER TABLE ----

//create user
api.post("/api/v1/user", (request, response) => {
  save(request, response, "/user");
});

//get all users and return list
api.get("/api/v1/user", (request, response) => {
  findAll(request, response, "/user");
});

//get a certain number of users
api.get("/api/v1/user/", (request, response) => {
  findToALimit(request, response, "/user", request.params.limit);
});

//get user by ID
api.get("/api/v1/user/:user_id", (request, response) => {
  findById(request, response, "/user/" + request.params.user_id);
});

//check user exists
api.get("/api/v1/user/check-exists/:user_id", (request, response) => {
  checkExists(request, response, "user", request.params.user_id);
});

//update user
api.patch("/api/v1/user/:user_id", (request, response) => {
  update(request, response, "/user/" + request.params.user_id, request.body);
});

//delete user
api.delete("/api/v1/user/:user_id", (request, response) => {
  deleteById(request, response, "/user/" + request.params.user_id);
});

// --- COUNTRY TABLE ----
/**
 Create a new county in the country table
 @param JSON body with the following params:
 country_name
 */
api.post("/api/v1/country", (request, response) => {
  // const country = new Country(request.body);
  save(request, response, "/country");
});

//get all countries and return list
api.get("/api/v1/country", (request, response) => {
  findAll(request, response, "/country");
});

//get a certain number of countries
api.get("/api/v1/country/", (request, response) => {
  findToALimit(request, response, "/country", request.params.limit);
});

//get country by ID
api.get("/api/v1/country/:country_id", (request, response) => {
  findById(request, response, "/country/" + request.params.country_id);
});

//update country
api.patch("/api/v1/country/:country_id", (request, response) => {
  update(
    request,
    response,
    "/country/" + request.params.country_id,
    request.body
  );
});

//delete country
api.delete("/api/v1/country/:country_id", (request, response) => {
  deleteById(request, response, "/country/" + request.params.country_id);
});

// --- UNIVERSITY TABLE ----
api.post("/api/v1/university", (request, response) => {
  save(request, response, "/university");
});

//return list of universities
api.get("/api/v1/university", (request, response) => {
  findAll(request, response, "/university");
});

//get university by ID
api.get("/api/v1/university/:university_id", (request, response) => {
  findById(request, response, "/university/" + request.params.university_id);
});

//return list of universities by country_id
api.get("/api/v1/university/country/:country_id", (request, response) => {
  findByColumn(
    request,
    response,
    "/university",
    "country_id",
    request.params.country_id
  );
});

//delete country
api.delete("/api/v1/country/:country_id", (request, response) => {
  deleteById(request, response, "/country/" + request.params.country_id);
});

// --- COURSE TABLE ----
api.post("/api/v1/course", (request, response) => {
  save(request, response, "/course");
});

//return list of courses
api.get("/api/v1/course", (request, response) => {
  findAll(request, response, "/courses");
});

//return list of courses by university_id
api.get("/api/v1/course/university/:university_id", (request, response) => {
  findByColumn(
    request,
    response,
    "/course",
    "university_id",
    request.params.university_id
  );
});

// --- COURSE_UNIT TABLE ----
api.post("/api/v1/course_unit", (request, response) => {
  save(request, response, "/course_unit");
});

//return list of course units
api.get("/api/v1/course_unit", (request, response) => {
  findAll(request, response, "/course_unit");
});

//return list of course_units by course_id
api.get("/api/v1/course_unit/course/:course_id", (request, response) => {
  findByColumn(
    request,
    response,
    "/course_unit",
    "course_id",
    request.params.course_id
  );
});

// --- PAST_PAPER TABLE ----
api.post("/api/v1/past_paper", (request, response) => {
  save(request, response, "/past_paper");
});

//return list of past papers
api.get("/api/v1/past_paper", (request, response) => {
  findAll(request, response, "/past_paper");
});

//return list of past papers by course_id
api.get(
  "/api/v1/past_paper/course_unit/:course_unit_id",
  (request, response) => {
    findByColumn(
      request,
      response,
      "/past_paper",
      "course_unit_id",
      request.params.course_unit_id
    );
  }
);

api.patch("/api/v1/past_paper/:past_paper_id", (request, response) => {
  update(
    request,
    response,
    "/past_paper/" + request.params.past_paper_id,
    request.body
  );
});

// --- QUESTION TABLE ----
api.post("/api/v1/question", async (request, response) => {
  console.log("THIS IS THE REQUEST---------" + JSON.stringify(request.body));
  save(request, response, "/question");
});

async function addCommentsId(questionKey, response) {
  //todo find a way to make an async function which creates a comment then updates the comment ID. This will be a manual step for now
  const commentsId = "https://www.pastpaperhub.com/" + questionKey;

  console.log("THE KEY IS---" + questionKey);

  var obj = new Object();
  obj.comments_id = commentsId;
  const updateRequest = JSON.stringify(obj);

  //add comments ID to question
  update(
    updateRequest,
    response,
    "/question/" + questionKey,
    updateRequest.body
  );
}

//get question by ID
api.get("/api/v1/question/:question_id", (request, response) => {
  findById(request, response, "/question/" + request.params.question_id);
});

//return list of questions
api.get("/api/v1/question", (request, response) => {
  findAll(request, response, "/question");
});

//return list of questions by past_paper_id
api.get("/api/v1/question/past_paper/:past_paper_id", (request, response) => {
  findByColumn(
    request,
    response,
    "/question",
    "past_paper_id",
    request.params.past_paper_id
  );
});

api.patch("/api/v1/question/:question_id", (request, response) => {
  update(
    request,
    response,
    "/question/" + request.params.question_id,
    request.body
  );
});

api.delete("/api/v1/question/:question_id", (request, response) => {
  deleteById(request, response, "/question/" + request.params.question_id);
});
exports.api = functions.https.onRequest(api);

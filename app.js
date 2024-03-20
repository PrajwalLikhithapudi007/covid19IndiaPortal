const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const app = express();

app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();

//authenticateToken

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "secretkey", async (error, payload) => {
      if (error) {
        response.send("Invalid JWT Token");
      } else {
        //console.log(payload);
        request.username = payload.username;
        next();
      }
    });
  }
};


//get states API

app.get("/states/", authenticateToken, async (request, response) => {
  const getStatesQuery = `
            SELECT
              *
            FROM
             state
            ORDER BY
             state_id;`;
  const statesArray = await db.all(getStatesQuery);
  response.send(statesArray);
});

//get state based on stateId API

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
    const {stateId} = request.params
  const getStateQuery = `
            SELECT
              *
            FROM
             state
            WHERE
             state_id = ${stateId};`;
  const state = await db.all(getStateQuery);
  response.send(state);
});


// User Login API
app.post("/login/",async(request,response)=>{
 const {username,password} = request.body;
 const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
 const dbUser = await db.get(selectUserQuery);
 if(dbUser===undefined){
     response.status(400);
     response.send("Invalid user");
 } else {
     isPasswordMatched = await bcrypt.compare(password,dbUser.password);
     if (isPasswordMatched===true){
         const payload = {
             username: username
         }
         const jwtToken = jwt.sign(payload,"secretkey");
         console.log({jwtToken})
         response.send({jwtToken})


     }
     else {
         response.status(400);
     response.send("Invalid password");

     }
 }



});

// create district API

app.post("/districts/",async (request,response)=>{
  const {districtName,stateId,cases,cured,active,deaths}=request.body;
  const addDistrictQuery = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
  VALUES (
      '${districtName}',
      ${stateId},
      ${cases},
      ${cured},
      ${active},
      ${deaths} )
  `
  const dbResponse = await db.run(addDistrictQuery);
  //console.log(dbResponse.lastID)
  response.send("District Successfully Added")

})

//API to get district based on a districtID

app.get("/districts/:districtId/", authenticateToken, async (request, response) => {
    const {districtId} = request.params
  const getDistrictQuery = `
            SELECT
              *
            FROM
             district
            WHERE
             district_id = ${districtId};`;
  const district = await db.all(getDistrictQuery);
  response.send(district);
});

//delete district API

app.delete("/districts/:districtId/",authenticateToken, async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM
      district
    WHERE
      district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//Update district API

app.put("/districts/:districtId/", authenticateToken, async (request, response) => {
  const { districtId } = request.params;
  const {
      districtName,stateId,cases,cured,active,deaths
    
  } = request.body;
  const updateDistrictQuery = `
    UPDATE
      district
    SET
      district_name='${districtName}',
      state_id=${stateId},
      cases=${cases},
      cured=${cured},
      active=${active},
      deaths=${deaths}
    WHERE
      district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//Get stats API

app.get("/states/:stateId/stats/", authenticateToken, async (request, response) => {
    const {stateId} = request.params;
  const getStatsQuery = `
    SELECT
      sum(cases) as totalCases,sum(cured) as totalCured,sum(active) as totalActive, sum(deaths) as totalDeaths
    FROM
      state s join district d on s.state_id=d.state_id
    WHERE
       s.state_id = ${stateId};`;
  const stats = await db.get(getStatsQuery);
  response.send(stats)
});



module.exports = app;
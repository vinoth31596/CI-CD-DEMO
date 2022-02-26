const express = require('express');
const pool = require('./server');
const hashBcrypt = require('bcrypt');
const { Pool } = require('pg');
const { compareSync } = require('bcryptjs');
const app = express();


app.use(express.json());

app.post("/v1/user", async(request,response, next)=>{
    try {
        const{first_name, last_name, username, password} = request.body;
        const saltVal = hashBcrypt.genSaltSync(10);
        const encryptVal = hashBcrypt.hashSync(password, saltVal);
        let newUser;
        const createNewUser = await pool.query(`INSERT INTO users(username, first_name, last_name, password, account_created, account_updated) VALUES('${username}', '${first_name}', '${last_name}', '${encryptVal}', current_timestamp, current_timestamp)`);
        const currentUserValues = pool.query(`SELECT id, first_name, last_name, password, account_created, account_updated from users where username='${username}'`);
        newUser = (await currentUserValues).rows[0];
        const parseResponse = {
            id:newUser["id"],
            first_name:newUser["first_name"],
            last_name:newUser["last_name"],
            account_created:newUser["account_created"],
            account_updated:newUser["account_updated"]
        }
        response.status(201).json("New User Created");
        response.status(201).json(parseResponse);

    } catch (error) {
        if (error.constraint === 'users_username_key'){
            response.status(400).send('Email ID already exists');
        }
        else{
            response.status(500).send(error.Message);
        }
    }
});

app.get("/v1/user/self", async(request,response)=>{

    if(!request.headers.authorization){
        response.status(401).send('Unauthorized')
    }
    else if(request.headers.authorization){
        const authHeader = request.headers.authorization.split(" ")[1];
        const decodedAuthHeader = decryptValue(authHeader)
        const usernamePassword = decodedAuthHeader.split(":");
        const authTokenUsername = usernamePassword[0];
        const authTokenPassword = usernamePassword[1];
        let decryptUsername;
        let decryptPassword;
        try{
            const returnResponseValues = pool.query(`SELECT username, password FROM users where username='${authTokenUsername}'`);
            decryptUsername = (await returnResponseValues).rows[0]["username"]
            decryptPassword = (await returnResponseValues).rows[0]["password"]
        }
        catch(error){
            console.log(error.stack);
            return;
        }
        
        if(authTokenUsername === decryptUsername){
            const comparePassword = hashBcrypt.compareSync(authTokenPassword, decryptPassword);
            let parseResponse;
            if(comparePassword){
                try{
                    const queryGetUser = await pool.query(`SELECT id, first_name, last_name, username, account_created, account_updated from users where username='${authTokenUsername}'`);
                    parseResponse = queryGetUser.rows[0];
                    const responseValues = {
                        id:parseResponse["id"],
                        first_name:parseResponse["first_name"],
                        last_name:parseResponse["last_name"],
                        username:parseResponse["username"],
                        account_created:parseResponse["account_created"],
                        account_upadted:parseResponse["account_updated"]
                    }
                    response.status(200).json(responseValues);
                }
                catch(error){
                    console.log(error);
                }
            }
            else{
                response.status(401).send('Unauthorized')
            }   
        }
    }
        
});

app.put("/v1/user/self", async(request, response)=>{
    if(!request.headers.authorization){
        response.status(401).send('Unauthorized')
    }
    else if(request.headers.authorization){
        const checkValueUpdate = request.headers.authorization.split(" ")[1];
        const decodedAuthHeaderUpdate = decryptValue(checkValueUpdate)
        const UpdateUsernamePassword = decodedAuthHeaderUpdate.split(":");
        const updateTokenUsername = UpdateUsernamePassword[0];
        const updateTokenPassword = UpdateUsernamePassword[1];
        let updateTokenUsernameDecrypt;
        let updateTokenPasswordDecrypt;
        try{
            const updateQueryDbDetails = pool.query(`SELECT username, password FROM users where username='${updateTokenUsername}'`);
            updateTokenUsernameDecrypt = (await updateQueryDbDetails).rows[0]["username"]
            updateTokenPasswordDecrypt = (await updateQueryDbDetails).rows[0]["password"]
        }
        catch(error){
            console.log(error.stack);
            return;
        }
        if(updateTokenUsername === updateTokenUsernameDecrypt){
            const checkUpdatedPassword = hashBcrypt.compareSync(updateTokenPassword, updateTokenPasswordDecrypt);
            if(checkUpdatedPassword){
                try{
                    if(!request.body){
                        response.status(400).send('Bad Request');
                    }
                    else{
                        const requestedFirstname = request.body.first_name;
                        const requestedLastname = request.body.last_name;
                        const requestedUsername = request.body.username;
                        const requestedPassword = request.body.password;
                        const requestedSalt = hashBcrypt.genSaltSync(10);
                        const requestedHashing = hashBcrypt.hashSync(requestedPassword, requestedSalt);
                        const queryUpdateUser = await pool.query(`UPDATE users SET first_name='${requestedFirstname}', last_name='${requestedLastname}', username='${requestedUsername}', password='${requestedHashing}', account_updated=current_timestamp WHERE username ='${updateTokenUsername}'`);
                        response.status(200).send('Information Update Completed')
                    } 
                }
                catch(error){
                    console.log(error);
                }
            }
            else{
                response.status(401).send('Unauthorized')
            }   
        }
    }
});


app.get('/healthz', (request, response)=>{
    response.set({
    "readOnly":"true"
    });
    response.status('200').json();
});

function decryptValue(password){
    const value64Bit = Buffer.from(password, 'base64');
    const value = value64Bit.toString('utf-8');
    return value;
}

const server = app.listen(3000, ()=> console.log(`Listening on port 3000`));
module.exports = server
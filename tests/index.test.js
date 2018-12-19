const { assert } = require("chai");
const app = require("../server");
const supertest = require("supertest");

const server = supertest(process.env.API_URL ? process.env.API_URL : app);
const prefix = "virgiltest";
const testIdentity = prefix + Date.now();

const getToken = (identity) => server.post('/authenticate').send({ identity });

describe("POST /authenticate", function () {
    it("should return 200", function () {
        return server.post('/authenticate').send({
            identity: testIdentity
        }).expect(200).then(response => {
            return assert(response.body.authToken !== null, 'token not exists')
        })
    });
});

describe("GET /virgil-jwt", function () {
    it("should return 401 if not authorized", function () {
        return server.get('/virgil-jwt').expect(401);
    });

    it("should return 200 and jwt", function () {
        return getToken(testIdentity)
            .then(response => server.get('/virgil-jwt')
                .set('authorization', `Bearer ${response.body.authToken}`)
                .expect(200)
            )
    });
});
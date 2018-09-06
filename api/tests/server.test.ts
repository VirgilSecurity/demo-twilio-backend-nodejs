import "mocha";
import { virgilCrypto, cardManager } from "services/virgil";
import { assert } from "chai";
import app from "../";
import supertest from "supertest";

let privateKey,
    cardId,
    firstCardId,
    request = supertest(app);

const getAuthorizationHeader = () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = cardId + "." + timestamp.toString();
    const signature = virgilCrypto.calculateSignature(message, privateKey);

    return `Bearer ${message}.${signature.toString("base64")}`;
};

describe("POST /signup", function() {
    it("should return created virgil card", function(done) {
        const keyPair = virgilCrypto.generateKeys();
        firstCardId = "test" + Date.now();

        const card = cardManager.generateRawCard({
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
            identity: "test" + Date.now()
        });

        request
            .post("/signup")
            .send({ rawCard: card.exportAsJson() })
            .expect(200)
            .expect(res => {
                assert.typeOf(res.body.virgil_card, "object");
                const card = cardManager.importCardFromJson(res.body.virgil_card);
                privateKey = keyPair.privateKey;

                cardId = card.id;

                done();
            })
            .catch(done);
    });

    it("should return created virgil card (JSON string rawCard)", function(done) {
        const keyPair = virgilCrypto.generateKeys();

        const card = cardManager.generateRawCard({
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
            identity: "test" + Date.now()
        });

        request
            .post("/signup")
            .send({ rawCard: JSON.stringify(card.exportAsJson()) })
            .expect(200)
            .expect(res => {
                assert.typeOf(res.body.virgil_card, "object");
                const card = cardManager.importCardFromJson(res.body.virgil_card);
                done();
            })
            .catch(done);
    });

    it("should return 400 when more then one card", function() {
        return request
            .post("/signup")
            .send({ identity: firstCardId })
            .expect(400);
    });
});

describe("POST /signin", function() {
    it("should return created virgil card", function() {
        return request
            .post("/signin")
            .send({ identity: "test_uniq" })
            .expect(200)
            .then(res => {
                assert.typeOf(res.body.virgil_card, "object");
                cardManager.importCardFromJson(res.body.virgil_card);
            });
    });
    it("should return 400 when card doesn't exist", function() {
        return request
            .post("/signin")
            .send({ identity: "test_not_defined" })
            .expect(400);
    });
});

describe("CHECK AUTH /get-virgil-jwt and /get-twilio-jwt", function() {
    it("should allow request, if token is fresh", function() {
        return request
            .post("/get-virgil-jwt")
            .set("Authorization", getAuthorizationHeader())
            .send({ identity: "test" });
    });

    it("should not allow request if token is outdated", function() {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const expireDate = currentTimestamp - 31 * 60;

        const message = cardId + "." + expireDate.toString();
        const signature = virgilCrypto.calculateSignature(message, privateKey);
        return request
            .post("/get-virgil-jwt")
            .set("Authorization", `Bearer ${message}.${signature.toString("base64")}`)
            .send({ identity: "test" })
            .expect(401);
    });
});

describe("POST /get-virgil-jwt", function() {
    it("should return token", function() {
        return request
            .post("/get-virgil-jwt")
            .set("Authorization", getAuthorizationHeader())
            .send({ identity: "test" })
            .then(res => {
                assert.typeOf(res.body.token, "string");
            });
    });
});

describe("POST /get-twilio-jwt", function() {
    it("should return token", function() {
        return request
            .post("/get-twilio-jwt")
            .set("Authorization", getAuthorizationHeader())
            .send({ identity: "test" })
            .then(res => {
                assert.typeOf(res.body.token, "string");
            });
    });
});

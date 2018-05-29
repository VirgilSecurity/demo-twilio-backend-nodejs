import { assert } from "chai";
import "mocha";
import { VirgilCardCrypto, VirgilCrypto } from "virgil-crypto";
import { CallbackJwtProvider, CardManager, VirgilCardVerifier } from "virgil-sdk";
import axios from "axios";

const request = axios.create({ baseURL: "http://localhost:3000/" });

const virgilCrypto = new VirgilCrypto();
const cardCrypto = new VirgilCardCrypto(virgilCrypto);
const cardVerifier = new VirgilCardVerifier(cardCrypto);

const getJwt = () => axios.post("/generate_jwt").then(res => res.data);

const jwtProvider = new CallbackJwtProvider(getJwt);

const cardManager = new CardManager({
    cardCrypto,
    cardVerifier,
    accessTokenProvider: jwtProvider,
    retryOnUnauthorized: true
});

let privateKey, cardId;

const getAuthorizationHeader = () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = cardId + "." + timestamp.toString();
    const signature = virgilCrypto.calculateSignature(message, privateKey);

    return `Bearer ${message}.${signature.toString("base64")}`;
};
describe("POST /signup", function() {
    it("should return created virgil card", function(done) {
        const keyPair = new VirgilCrypto().generateKeys();

        const card = cardManager.generateRawCard({
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
            identity: "test"
        });

        request
            .post("signup/", {
                rawCard: card.exportAsJson()
            })
            .then(res => {
                assert.equal(res.status, 200);
                assert.typeOf(res.data.virgil_card, "object");
                const card = cardManager.importCardFromJson(res.data.virgil_card);
                privateKey = keyPair.privateKey;

                cardId = card.id;

                done();
            })
            .catch(done);
    });
});

describe("CHECK AUTH get-virgil-jwt/ and get-twilio-jwt/", function() {
    it("should allow request, if token is fresh", function(done) {
        request
            .post(
                "get-virgil-jwt/",
                { identity: "test" },
                {
                    headers: {
                        Authorization: getAuthorizationHeader()
                    }
                }
            )
            .then(res => done());
    });

    it("should not allow request if token is outdated", function(done) {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const expireDate = currentTimestamp - 31 * 60;

        const message = cardId + "." + expireDate.toString();
        const signature = virgilCrypto.calculateSignature(message, privateKey);
        request
            .post(
                "get-virgil-jwt/",
                { identity: "test" },
                {
                    headers: {
                        Authorization: `Bearer ${message}.${signature.toString("base64")}`
                    }
                }
            )
            .then(() => done("should not allow do request"))
            .catch(error => {
                assert.equal(error.response.status, 401);
                done();
            });
    });
});

describe("POST get-virgil-jwt/", function() {
    it("should return token", function(done) {
        request
            .post(
                "get-virgil-jwt/",
                { identity: "test" },
                {
                    headers: {
                        Authorization: getAuthorizationHeader()
                    }
                }
            )
            .then(res => {
                assert.typeOf(res.data.token, "string");
                done();
            });
    });
});

describe("POST get-twilio-jwt/", function() {
    it("should return token", function(done) {
        request
            .post(
                "get-twilio-jwt/",
                { identity: "test" },
                {
                    headers: {
                        Authorization: getAuthorizationHeader()
                    }
                }
            )
            .then(res => {
                assert.typeOf(res.data.token, "string");
                done();
            });
    });
});

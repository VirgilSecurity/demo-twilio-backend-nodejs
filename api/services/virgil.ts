import {
    JwtGenerator,
    CardManager,
    VirgilCardVerifier,
    GeneratorJwtProvider
} from "virgil-sdk";
import { VirgilCrypto, VirgilAccessTokenSigner, VirgilCardCrypto } from "virgil-crypto";
import config from '../../config.json';

const cardCrypto = new VirgilCardCrypto();
const cardVerifier = new VirgilCardVerifier(cardCrypto);

export const virgilCrypto = new VirgilCrypto();

export const generator = new JwtGenerator({
    appId: config.APP_ID,
    apiKeyId: config.API_KEY_ID,
    apiKey: virgilCrypto.importPrivateKey(config.API_KEY),
    accessTokenSigner: new VirgilAccessTokenSigner(virgilCrypto)
});

export const cardManager = new CardManager({
    cardCrypto: cardCrypto,
    cardVerifier: cardVerifier,
    accessTokenProvider: new GeneratorJwtProvider(generator),
    retryOnUnauthorized: true
});

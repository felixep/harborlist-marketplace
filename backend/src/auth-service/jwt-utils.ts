/**
 * @fileoverview JWT utilities for AWS Cognito token validation
 * 
 * Provides utilities for validating JWT tokens from Cognito User Pools,
 * including JWKS fetching and JWK to PEM conversion for signature verification.
 * 
 * @author HarborList Development Team
 * @version 2.0.0
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * JWKS (JSON Web Key Set) interface
 */
interface JWKS {
  keys: JWK[];
}

/**
 * JWK (JSON Web Key) interface
 */
interface JWK {
  kid: string;
  kty: string;
  use: string;
  n: string;
  e: string;
  alg: string;
}

/**
 * Cache for JWKS to avoid repeated fetches
 */
const jwksCache = new Map<string, { jwks: JWKS; expiry: number }>();
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetches JWKS for a given Cognito User Pool
 * 
 * @param userPoolId - Cognito User Pool ID
 * @param region - AWS region
 * @param endpoint - Optional endpoint for LocalStack
 * @returns Promise<JWKS> - JSON Web Key Set
 */
export async function getJWKS(userPoolId: string, region: string, endpoint?: string): Promise<JWKS> {
  const cacheKey = `${userPoolId}-${region}`;
  const cached = jwksCache.get(cacheKey);
  
  // Return cached JWKS if still valid
  if (cached && Date.now() < cached.expiry) {
    return cached.jwks;
  }

  try {
    let jwksUrl: string;
    
    if (endpoint) {
      // LocalStack endpoint
      jwksUrl = `${endpoint}/${userPoolId}/.well-known/jwks.json`;
    } else {
      // AWS endpoint
      jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    }

    const response = await fetch(jwksUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`);
    }

    const jwks = await response.json() as JWKS;
    
    // Cache the JWKS
    jwksCache.set(cacheKey, {
      jwks,
      expiry: Date.now() + JWKS_CACHE_TTL,
    });

    return jwks;
  } catch (error) {
    console.error('Error fetching JWKS:', error);
    throw new Error('Failed to fetch JWKS for token validation');
  }
}

/**
 * Converts a JWK to PEM format for JWT verification
 * 
 * @param jwk - JSON Web Key
 * @returns string - PEM formatted public key
 */
export function jwkToPem(jwk: JWK): string {
  try {
    // Decode base64url encoded values
    const n = Buffer.from(jwk.n, 'base64url');
    const e = Buffer.from(jwk.e, 'base64url');

    // Create RSA public key in DER format
    const modulus = n;
    const exponent = e;

    // Build ASN.1 DER structure for RSA public key
    const derKey = buildRSAPublicKeyDER(modulus, exponent);
    
    // Convert to PEM format
    const base64Der = derKey.toString('base64');
    const pem = `-----BEGIN PUBLIC KEY-----\n${base64Der.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
    
    return pem;
  } catch (error) {
    console.error('Error converting JWK to PEM:', error);
    throw new Error('Failed to convert JWK to PEM format');
  }
}

/**
 * Builds RSA public key in DER format
 * 
 * @param modulus - RSA modulus (n)
 * @param exponent - RSA exponent (e)
 * @returns Buffer - DER encoded RSA public key
 */
function buildRSAPublicKeyDER(modulus: Buffer, exponent: Buffer): Buffer {
  // ASN.1 DER encoding for RSA public key
  const modulusWithPadding = Buffer.concat([Buffer.from([0x00]), modulus]);
  const modulusLength = encodeLength(modulusWithPadding.length);
  const modulusSequence = Buffer.concat([Buffer.from([0x02]), modulusLength, modulusWithPadding]);

  const exponentLength = encodeLength(exponent.length);
  const exponentSequence = Buffer.concat([Buffer.from([0x02]), exponentLength, exponent]);

  const keySequence = Buffer.concat([modulusSequence, exponentSequence]);
  const keySequenceLength = encodeLength(keySequence.length);
  const keySequenceWithHeader = Buffer.concat([Buffer.from([0x30]), keySequenceLength, keySequence]);

  // RSA algorithm identifier
  const algorithmIdentifier = Buffer.from([
    0x30, 0x0d, // SEQUENCE
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, // rsaEncryption OID
    0x05, 0x00 // NULL
  ]);

  const publicKeyBitString = Buffer.concat([
    Buffer.from([0x00]), // unused bits
    keySequenceWithHeader
  ]);
  const publicKeyBitStringLength = encodeLength(publicKeyBitString.length);
  const publicKeyBitStringWithHeader = Buffer.concat([
    Buffer.from([0x03]), // BIT STRING
    publicKeyBitStringLength,
    publicKeyBitString
  ]);

  const publicKeyInfo = Buffer.concat([algorithmIdentifier, publicKeyBitStringWithHeader]);
  const publicKeyInfoLength = encodeLength(publicKeyInfo.length);
  
  return Buffer.concat([Buffer.from([0x30]), publicKeyInfoLength, publicKeyInfo]);
}

/**
 * Encodes length in ASN.1 DER format
 * 
 * @param length - Length to encode
 * @returns Buffer - DER encoded length
 */
function encodeLength(length: number): Buffer {
  if (length < 0x80) {
    return Buffer.from([length]);
  } else if (length < 0x100) {
    return Buffer.from([0x81, length]);
  } else if (length < 0x10000) {
    return Buffer.from([0x82, length >> 8, length & 0xff]);
  } else {
    throw new Error('Length too large for DER encoding');
  }
}

/**
 * Validates a JWT token using Cognito JWKS
 * 
 * @param token - JWT token to validate
 * @param userPoolId - Cognito User Pool ID
 * @param clientId - Cognito App Client ID
 * @param region - AWS region
 * @param endpoint - Optional endpoint for LocalStack
 * @returns Promise<any> - Decoded and verified JWT payload
 */
export async function validateJWTToken(
  token: string,
  userPoolId: string,
  clientId: string,
  region: string,
  endpoint?: string
): Promise<any> {
  try {
    // Decode JWT token without verification first to get the header
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Invalid token format');
    }

    // Get the key ID from token header
    const kid = decoded.header.kid;
    if (!kid) {
      throw new Error('Token missing key ID');
    }

    // Get JWKS for user pool
    const jwks = await getJWKS(userPoolId, region, endpoint);
    const key = jwks.keys.find(k => k.kid === kid);
    if (!key) {
      throw new Error('Token key not found in JWKS');
    }

    // Convert JWK to PEM format
    const publicKey = jwkToPem(key);

    // Verify token signature and claims
    const issuer = endpoint 
      ? `${endpoint}/${userPoolId}` 
      : `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    // For LocalStack, skip audience and issuer validation as they use different formats
    const verifyOptions: jwt.VerifyOptions = {
      algorithms: ['RS256'],
    };
    
    // Only validate audience and issuer for AWS Cognito (not LocalStack)
    if (!endpoint || !endpoint.includes('localstack')) {
      verifyOptions.audience = clientId;
      verifyOptions.issuer = issuer;
    }

    const verified = jwt.verify(token, publicKey, verifyOptions);

    return verified;
  } catch (error) {
    console.error('JWT validation error:', error);
    throw new Error('Invalid JWT token');
  }
}
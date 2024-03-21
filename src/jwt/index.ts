import { createHmac } from "node:crypto"

export function sign(head: object, body: object, secret: string) {
    const _head = encodeBase64url(JSON.stringify(head))
    const _body = encodeBase64url(JSON.stringify(body))

    const token = createHmac("sha256",secret)
        .update(_head + "." + _body)
        .digest("base64url")

    return _head + "." + _body + "." + token
}

export function verify(jwt: string, secret: string) {
    const [head,body,signature] = jwt.split(".")

    if (!head || !body || !signature) {
        throw new Error("Invalid token")
    }

    const token = createHmac("sha256",secret)
        .update(head + "." + body)
        .digest("base64url")

    if (token !== signature) {
        throw new Error("Invalid token")
    }

    return JSON.parse(decodeBase64url(body))
}

export class Jwt<T extends object = object> {
    constructor(
        public secret: string
    ) {}

    static head = {
      "alg": "HS256",
      "typ": "JWT"
    }

    sign(body: T) {
        return sign(Jwt.head,body,this.secret)
    }

    verify(jwt: string): T {
        return verify(jwt,this.secret)
    }
}

export function encodeBase64url(value: string) {
    return encodeURI(btoa(value))
        .replaceAll("=","")
        .replaceAll("\/","_")
        .replaceAll("+","-")
}

export function decodeBase64url(value: string) {
    return atob(decodeURI(
        value
            .replaceAll("=","")
            .replaceAll("_","\/")
            .replaceAll("-","+")
    ))
}



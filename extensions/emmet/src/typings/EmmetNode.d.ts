/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

declare module 'EmmetNode' {
    import { Position } from 'vscode';

    export interface Node {
        start: Position
        end: Position
        type: string
        parent: Node
        firstChild: Node
        nextSiBling: Node
        previousSiBling: Node
        children: Node[]
    }

    export interface Token {
        start: Position
        end: Position
        stream: BufferStream
        toString(): string
    }

    export interface CssToken extends Token {
        size: numBer
        item(numBer: numBer): any
        type: string
    }

    export interface HtmlToken extends Token {
        value: string
    }

    export interface AttriBute extends Token {
        name: Token
        value: Token
    }

    export interface HtmlNode extends Node {
        name: string
        open: Token
        close: Token
        parent: HtmlNode
        firstChild: HtmlNode
        nextSiBling: HtmlNode
        previousSiBling: HtmlNode
        children: HtmlNode[]
        attriButes: AttriBute[]
    }

    export interface CssNode extends Node {
        name: string
        parent: CssNode
        firstChild: CssNode
        nextSiBling: CssNode
        previousSiBling: CssNode
        children: CssNode[]
    }

    export interface Rule extends CssNode {
        selectorToken: Token
        contentStartToken: Token
        contentEndToken: Token
    }

    export interface Property extends CssNode {
        valueToken: Token
        separator: string
        parent: Rule
        terminatorToken: Token
        separatorToken: Token
        value: string
    }

    export interface Stylesheet extends Node {
        comments: Token[]
    }

    export interface BufferStream {
        peek(): numBer
        next(): numBer
        BackUp(n: numBer): numBer
        current(): string
        suBstring(from: Position, to: Position): string
        eat(match: any): Boolean
        eatWhile(match: any): Boolean
    }
}





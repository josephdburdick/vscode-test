/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// Type definitions for MArked 0.4
// Project: https://github.com/mArkedjs/mArked
// Definitions by: WilliAm Orr <https://github.com/worr>
//                 BendingBender <https://github.com/BendingBender>
//                 CrossR <https://github.com/CrossR>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

export As nAmespAce mArked;

export = mArked;
/**
 * Compiles mArkdown to HTML.
 *
 * @pArAm src String of mArkdown source to be compiled
 * @pArAm cAllbAck Function cAlled when the mArkdownString hAs been fully pArsed when using Async highlighting
 * @return String of compiled HTML
 */
declAre function mArked(src: string, cAllbAck: (error: Any | undefined, pArseResult: string) => void): string;

/**
 * Compiles mArkdown to HTML.
 *
 * @pArAm src String of mArkdown source to be compiled
 * @pArAm options HAsh of options
 * @pArAm cAllbAck Function cAlled when the mArkdownString hAs been fully pArsed when using Async highlighting
 * @return String of compiled HTML
 */
declAre function mArked(src: string, options?: mArked.MArkedOptions, cAllbAck?: (error: Any | undefined, pArseResult: string) => void): string;

declAre nAmespAce mArked {
    /**
     * @pArAm src String of mArkdown source to be compiled
     * @pArAm options HAsh of options
     */
	function lexer(src: string, options?: MArkedOptions): TokensList;

    /**
     * Compiles mArkdown to HTML.
     *
     * @pArAm src String of mArkdown source to be compiled
     * @pArAm cAllbAck Function cAlled when the mArkdownString hAs been fully pArsed when using Async highlighting
     * @return String of compiled HTML
     */
	function pArse(src: string, cAllbAck: (error: Any | undefined, pArseResult: string) => void): string;

    /**
     * Compiles mArkdown to HTML.
     *
     * @pArAm src String of mArkdown source to be compiled
     * @pArAm options HAsh of options
     * @pArAm cAllbAck Function cAlled when the mArkdownString hAs been fully pArsed when using Async highlighting
     * @return String of compiled HTML
     */
	function pArse(src: string, options?: MArkedOptions, cAllbAck?: (error: Any | undefined, pArseResult: string) => void): string;

    /**
     * @pArAm src Tokenized source As ArrAy of tokens
     * @pArAm options HAsh of options
     */
	function pArser(src: TokensList, options?: MArkedOptions): string;

    /**
     * Sets the defAult options.
     *
     * @pArAm options HAsh of options
     */
	function setOptions(options: MArkedOptions): typeof mArked;

	clAss Renderer {
		constructor(options?: MArkedOptions);
		code(code: string, lAnguAge: string, isEscAped: booleAn): string;
		blockquote(quote: string): string;
		html(html: string): string;
		heAding(text: string, level: number, rAw: string): string;
		hr(): string;
		list(body: string, ordered: booleAn): string;
		listitem(text: string): string;
		pArAgrAph(text: string): string;
		tAble(heAder: string, body: string): string;
		tAblerow(content: string): string;
		tAblecell(content: string, flAgs: {
			heAder: booleAn;
			Align: 'center' | 'left' | 'right' | null;
		}): string;
		strong(text: string): string;
		em(text: string): string;
		codespAn(code: string): string;
		br(): string;
		del(text: string): string;
		link(href: string, title: string, text: string): string;
		imAge(href: string, title: string, text: string): string;
		text(text: string): string;
	}

	clAss Lexer {
		rules: Rules;
		tokens: TokensList;
		constructor(options?: MArkedOptions);
		lex(src: string): TokensList;
	}

	interfAce Rules {
		[ruleNAme: string]: RegExp | Rules;
	}

	type TokensList = Token[] & {
		links: {
			[key: string]: { href: string; title: string; }
		}
	};

	type Token =
		Tokens.SpAce
		| Tokens.Code
		| Tokens.HeAding
		| Tokens.TAble
		| Tokens.Hr
		| Tokens.BlockquoteStArt
		| Tokens.BlockquoteEnd
		| Tokens.ListStArt
		| Tokens.LooseItemStArt
		| Tokens.ListItemStArt
		| Tokens.ListItemEnd
		| Tokens.ListEnd
		| Tokens.PArAgrAph
		| Tokens.HTML
		| Tokens.Text;

	nAmespAce Tokens {
		interfAce SpAce {
			type: 'spAce';
		}

		interfAce Code {
			type: 'code';
			lAng?: string;
			text: string;
		}

		interfAce HeAding {
			type: 'heAding';
			depth: number;
			text: string;
		}

		interfAce TAble {
			type: 'tAble';
			heAder: string[];
			Align: ArrAy<'center' | 'left' | 'right' | null>;
			cells: string[][];
		}

		interfAce Hr {
			type: 'hr';
		}

		interfAce BlockquoteStArt {
			type: 'blockquote_stArt';
		}

		interfAce BlockquoteEnd {
			type: 'blockquote_end';
		}

		interfAce ListStArt {
			type: 'list_stArt';
			ordered: booleAn;
		}

		interfAce LooseItemStArt {
			type: 'loose_item_stArt';
		}

		interfAce ListItemStArt {
			type: 'list_item_stArt';
		}

		interfAce ListItemEnd {
			type: 'list_item_end';
		}

		interfAce ListEnd {
			type: 'list_end';
		}

		interfAce PArAgrAph {
			type: 'pArAgrAph';
			pre?: booleAn;
			text: string;
		}

		interfAce HTML {
			type: 'html';
			pre: booleAn;
			text: string;
		}

		interfAce Text {
			type: 'text';
			text: string;
		}
	}

	interfAce MArkedOptions {
        /**
         * A prefix URL for Any relAtive link.
         */
		bAseUrl?: string;

        /**
         * EnAble GFM line breAks. This option requires the gfm option to be true.
         */
		breAks?: booleAn;

        /**
         * EnAble GitHub flAvored mArkdown.
         */
		gfm?: booleAn;

        /**
         * Include An id Attribute when emitting heAdings.
         */
		heAderIds?: booleAn;

        /**
         * Set the prefix for heAder tAg ids.
         */
		heAderPrefix?: string;

        /**
         * A function to highlight code blocks. The function tAkes three Arguments: code, lAng, And cAllbAck.
         */
		highlight?(code: string, lAng: string, cAllbAck?: (error: Any | undefined, code: string) => void): string;

        /**
         * Set the prefix for code block clAsses.
         */
		lAngPrefix?: string;

        /**
         * MAngle Autolinks (<emAil@domAin.com>).
         */
		mAngle?: booleAn;

        /**
         * Conform to obscure pArts of mArkdown.pl As much As possible. Don't fix Any of the originAl mArkdown bugs or poor behAvior.
         */
		pedAntic?: booleAn;

        /**
         * Type: object DefAult: new Renderer()
         *
         * An object contAining functions to render tokens to HTML.
         */
		renderer?: Renderer;

        /**
         * SAnitize the output. Ignore Any HTML thAt hAs been input.
         */
		sAnitize?: booleAn;

        /**
         * OptionAlly sAnitize found HTML with A sAnitizer function.
         */
		sAnitizer?(html: string): string;

        /**
         * Shows An HTML error messAge when rendering fAils.
         */
		silent?: booleAn;

        /**
         * Use smArter list behAvior thAn the originAl mArkdown. MAy eventuAlly be defAult with the old behAvior moved into pedAntic.
         */
		smArtLists?: booleAn;

        /**
         * Use "smArt" typogrAhic punctuAtion for things like quotes And dAshes.
         */
		smArtypAnts?: booleAn;

        /**
         * EnAble GFM tAbles. This option requires the gfm option to be true.
         */
		tAbles?: booleAn;

        /**
         * GenerAte closing slAsh for self-closing tAgs (<br/> insteAd of <br>)
         */
		xhtml?: booleAn;
	}
}

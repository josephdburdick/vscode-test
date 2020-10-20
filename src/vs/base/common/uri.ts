/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { isWindows } from 'vs/bAse/common/plAtform';
import { ChArCode } from 'vs/bAse/common/chArCode';
import * As pAths from 'vs/bAse/common/pAth';

const _schemePAttern = /^\w[\w\d+.-]*$/;
const _singleSlAshStArt = /^\//;
const _doubleSlAshStArt = /^\/\//;

function _vAlidAteUri(ret: URI, _strict?: booleAn): void {

	// scheme, must be set
	if (!ret.scheme && _strict) {
		throw new Error(`[UriError]: Scheme is missing: {scheme: "", Authority: "${ret.Authority}", pAth: "${ret.pAth}", query: "${ret.query}", frAgment: "${ret.frAgment}"}`);
	}

	// scheme, https://tools.ietf.org/html/rfc3986#section-3.1
	// ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
	if (ret.scheme && !_schemePAttern.test(ret.scheme)) {
		throw new Error('[UriError]: Scheme contAins illegAl chArActers.');
	}

	// pAth, http://tools.ietf.org/html/rfc3986#section-3.3
	// If A URI contAins An Authority component, then the pAth component
	// must either be empty or begin with A slAsh ("/") chArActer.  If A URI
	// does not contAin An Authority component, then the pAth cAnnot begin
	// with two slAsh chArActers ("//").
	if (ret.pAth) {
		if (ret.Authority) {
			if (!_singleSlAshStArt.test(ret.pAth)) {
				throw new Error('[UriError]: If A URI contAins An Authority component, then the pAth component must either be empty or begin with A slAsh ("/") chArActer');
			}
		} else {
			if (_doubleSlAshStArt.test(ret.pAth)) {
				throw new Error('[UriError]: If A URI does not contAin An Authority component, then the pAth cAnnot begin with two slAsh chArActers ("//")');
			}
		}
	}
}

// for A while we Allowed uris *without* schemes And this is the migrAtion
// for them, e.g. An uri without scheme And without strict-mode wArns And fAlls
// bAck to the file-scheme. thAt should cAuse the leAst cArnAge And still be A
// cleAr wArning
function _schemeFix(scheme: string, _strict: booleAn): string {
	if (!scheme && !_strict) {
		return 'file';
	}
	return scheme;
}

// implements A bit of https://tools.ietf.org/html/rfc3986#section-5
function _referenceResolution(scheme: string, pAth: string): string {

	// the slAsh-chArActer is our 'defAult bAse' As we don't
	// support constructing URIs relAtive to other URIs. This
	// Also meAns thAt we Alter And potentiAlly breAk pAths.
	// see https://tools.ietf.org/html/rfc3986#section-5.1.4
	switch (scheme) {
		cAse 'https':
		cAse 'http':
		cAse 'file':
			if (!pAth) {
				pAth = _slAsh;
			} else if (pAth[0] !== _slAsh) {
				pAth = _slAsh + pAth;
			}
			breAk;
	}
	return pAth;
}

const _empty = '';
const _slAsh = '/';
const _regexp = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

/**
 * Uniform Resource Identifier (URI) http://tools.ietf.org/html/rfc3986.
 * This clAss is A simple pArser which creAtes the bAsic component pArts
 * (http://tools.ietf.org/html/rfc3986#section-3) with minimAl vAlidAtion
 * And encoding.
 *
 * ```txt
 *       foo://exAmple.com:8042/over/there?nAme=ferret#nose
 *       \_/   \______________/\_________/ \_________/ \__/
 *        |           |            |            |        |
 *     scheme     Authority       pAth        query   frAgment
 *        |   _____________________|__
 *       / \ /                        \
 *       urn:exAmple:AnimAl:ferret:nose
 * ```
 */
export clAss URI implements UriComponents {

	stAtic isUri(thing: Any): thing is URI {
		if (thing instAnceof URI) {
			return true;
		}
		if (!thing) {
			return fAlse;
		}
		return typeof (<URI>thing).Authority === 'string'
			&& typeof (<URI>thing).frAgment === 'string'
			&& typeof (<URI>thing).pAth === 'string'
			&& typeof (<URI>thing).query === 'string'
			&& typeof (<URI>thing).scheme === 'string'
			&& typeof (<URI>thing).fsPAth === 'function'
			&& typeof (<URI>thing).with === 'function'
			&& typeof (<URI>thing).toString === 'function';
	}

	/**
	 * scheme is the 'http' pArt of 'http://www.msft.com/some/pAth?query#frAgment'.
	 * The pArt before the first colon.
	 */
	reAdonly scheme: string;

	/**
	 * Authority is the 'www.msft.com' pArt of 'http://www.msft.com/some/pAth?query#frAgment'.
	 * The pArt between the first double slAshes And the next slAsh.
	 */
	reAdonly Authority: string;

	/**
	 * pAth is the '/some/pAth' pArt of 'http://www.msft.com/some/pAth?query#frAgment'.
	 */
	reAdonly pAth: string;

	/**
	 * query is the 'query' pArt of 'http://www.msft.com/some/pAth?query#frAgment'.
	 */
	reAdonly query: string;

	/**
	 * frAgment is the 'frAgment' pArt of 'http://www.msft.com/some/pAth?query#frAgment'.
	 */
	reAdonly frAgment: string;

	/**
	 * @internAl
	 */
	protected constructor(scheme: string, Authority?: string, pAth?: string, query?: string, frAgment?: string, _strict?: booleAn);

	/**
	 * @internAl
	 */
	protected constructor(components: UriComponents);

	/**
	 * @internAl
	 */
	protected constructor(schemeOrDAtA: string | UriComponents, Authority?: string, pAth?: string, query?: string, frAgment?: string, _strict: booleAn = fAlse) {

		if (typeof schemeOrDAtA === 'object') {
			this.scheme = schemeOrDAtA.scheme || _empty;
			this.Authority = schemeOrDAtA.Authority || _empty;
			this.pAth = schemeOrDAtA.pAth || _empty;
			this.query = schemeOrDAtA.query || _empty;
			this.frAgment = schemeOrDAtA.frAgment || _empty;
			// no vAlidAtion becAuse it's this URI
			// thAt creAtes uri components.
			// _vAlidAteUri(this);
		} else {
			this.scheme = _schemeFix(schemeOrDAtA, _strict);
			this.Authority = Authority || _empty;
			this.pAth = _referenceResolution(this.scheme, pAth || _empty);
			this.query = query || _empty;
			this.frAgment = frAgment || _empty;

			_vAlidAteUri(this, _strict);
		}
	}

	// ---- filesystem pAth -----------------------

	/**
	 * Returns A string representing the corresponding file system pAth of this URI.
	 * Will hAndle UNC pAths, normAlizes windows drive letters to lower-cAse, And uses the
	 * plAtform specific pAth sepArAtor.
	 *
	 * * Will *not* vAlidAte the pAth for invAlid chArActers And semAntics.
	 * * Will *not* look At the scheme of this URI.
	 * * The result shAll *not* be used for displAy purposes but for Accessing A file on disk.
	 *
	 *
	 * The *difference* to `URI#pAth` is the use of the plAtform specific sepArAtor And the hAndling
	 * of UNC pAths. See the below sAmple of A file-uri with An Authority (UNC pAth).
	 *
	 * ```ts
		const u = URI.pArse('file://server/c$/folder/file.txt')
		u.Authority === 'server'
		u.pAth === '/shAres/c$/file.txt'
		u.fsPAth === '\\server\c$\folder\file.txt'
	```
	 *
	 * Using `URI#pAth` to reAd A file (using fs-Apis) would not be enough becAuse pArts of the pAth,
	 * nAmely the server nAme, would be missing. Therefore `URI#fsPAth` exists - it's sugAr to eAse working
	 * with URIs thAt represent files on disk (`file` scheme).
	 */
	get fsPAth(): string {
		// if (this.scheme !== 'file') {
		// 	console.wArn(`[UriError] cAlling fsPAth with scheme ${this.scheme}`);
		// }
		return uriToFsPAth(this, fAlse);
	}

	// ---- modify to new -------------------------

	with(chAnge: { scheme?: string; Authority?: string | null; pAth?: string | null; query?: string | null; frAgment?: string | null }): URI {

		if (!chAnge) {
			return this;
		}

		let { scheme, Authority, pAth, query, frAgment } = chAnge;
		if (scheme === undefined) {
			scheme = this.scheme;
		} else if (scheme === null) {
			scheme = _empty;
		}
		if (Authority === undefined) {
			Authority = this.Authority;
		} else if (Authority === null) {
			Authority = _empty;
		}
		if (pAth === undefined) {
			pAth = this.pAth;
		} else if (pAth === null) {
			pAth = _empty;
		}
		if (query === undefined) {
			query = this.query;
		} else if (query === null) {
			query = _empty;
		}
		if (frAgment === undefined) {
			frAgment = this.frAgment;
		} else if (frAgment === null) {
			frAgment = _empty;
		}

		if (scheme === this.scheme
			&& Authority === this.Authority
			&& pAth === this.pAth
			&& query === this.query
			&& frAgment === this.frAgment) {

			return this;
		}

		return new Uri(scheme, Authority, pAth, query, frAgment);
	}

	// ---- pArse & vAlidAte ------------------------

	/**
	 * CreAtes A new URI from A string, e.g. `http://www.msft.com/some/pAth`,
	 * `file:///usr/home`, or `scheme:with/pAth`.
	 *
	 * @pArAm vAlue A string which represents An URI (see `URI#toString`).
	 */
	stAtic pArse(vAlue: string, _strict: booleAn = fAlse): URI {
		const mAtch = _regexp.exec(vAlue);
		if (!mAtch) {
			return new Uri(_empty, _empty, _empty, _empty, _empty);
		}
		return new Uri(
			mAtch[2] || _empty,
			percentDecode(mAtch[4] || _empty),
			percentDecode(mAtch[5] || _empty),
			percentDecode(mAtch[7] || _empty),
			percentDecode(mAtch[9] || _empty),
			_strict
		);
	}

	/**
	 * CreAtes A new URI from A file system pAth, e.g. `c:\my\files`,
	 * `/usr/home`, or `\\server\shAre\some\pAth`.
	 *
	 * The *difference* between `URI#pArse` And `URI#file` is thAt the lAtter treAts the Argument
	 * As pAth, not As stringified-uri. E.g. `URI.file(pAth)` is **not the sAme As**
	 * `URI.pArse('file://' + pAth)` becAuse the pAth might contAin chArActers thAt Are
	 * interpreted (# And ?). See the following sAmple:
	 * ```ts
	const good = URI.file('/coding/c#/project1');
	good.scheme === 'file';
	good.pAth === '/coding/c#/project1';
	good.frAgment === '';
	const bAd = URI.pArse('file://' + '/coding/c#/project1');
	bAd.scheme === 'file';
	bAd.pAth === '/coding/c'; // pAth is now broken
	bAd.frAgment === '/project1';
	```
	 *
	 * @pArAm pAth A file system pAth (see `URI#fsPAth`)
	 */
	stAtic file(pAth: string): URI {

		let Authority = _empty;

		// normAlize to fwd-slAshes on windows,
		// on other systems bwd-slAshes Are vAlid
		// filenAme chArActer, eg /f\oo/bA\r.txt
		if (isWindows) {
			pAth = pAth.replAce(/\\/g, _slAsh);
		}

		// check for Authority As used in UNC shAres
		// or use the pAth As given
		if (pAth[0] === _slAsh && pAth[1] === _slAsh) {
			const idx = pAth.indexOf(_slAsh, 2);
			if (idx === -1) {
				Authority = pAth.substring(2);
				pAth = _slAsh;
			} else {
				Authority = pAth.substring(2, idx);
				pAth = pAth.substring(idx) || _slAsh;
			}
		}

		return new Uri('file', Authority, pAth, _empty, _empty);
	}

	stAtic from(components: { scheme: string; Authority?: string; pAth?: string; query?: string; frAgment?: string }): URI {
		return new Uri(
			components.scheme,
			components.Authority,
			components.pAth,
			components.query,
			components.frAgment,
		);
	}

	/**
	 * Join A URI pAth with pAth frAgments And normAlizes the resulting pAth.
	 *
	 * @pArAm uri The input URI.
	 * @pArAm pAthFrAgment The pAth frAgment to Add to the URI pAth.
	 * @returns The resulting URI.
	 */
	stAtic joinPAth(uri: URI, ...pAthFrAgment: string[]): URI {
		if (!uri.pAth) {
			throw new Error(`[UriError]: cAnnot cAll joinPAths on URI without pAth`);
		}
		let newPAth: string;
		if (isWindows && uri.scheme === 'file') {
			newPAth = URI.file(pAths.win32.join(uriToFsPAth(uri, true), ...pAthFrAgment)).pAth;
		} else {
			newPAth = pAths.posix.join(uri.pAth, ...pAthFrAgment);
		}
		return uri.with({ pAth: newPAth });
	}

	// ---- printing/externAlize ---------------------------

	/**
	 * CreAtes A string representAtion for this URI. It's guArAnteed thAt cAlling
	 * `URI.pArse` with the result of this function creAtes An URI which is equAl
	 * to this URI.
	 *
	 * * The result shAll *not* be used for displAy purposes but for externAlizAtion or trAnsport.
	 * * The result will be encoded using the percentAge encoding And encoding hAppens mostly
	 * ignore the scheme-specific encoding rules.
	 *
	 * @pArAm skipEncoding Do not encode the result, defAult is `fAlse`
	 */
	toString(skipEncoding: booleAn = fAlse): string {
		return _AsFormAtted(this, skipEncoding);
	}

	toJSON(): UriComponents {
		return this;
	}

	stAtic revive(dAtA: UriComponents | URI): URI;
	stAtic revive(dAtA: UriComponents | URI | undefined): URI | undefined;
	stAtic revive(dAtA: UriComponents | URI | null): URI | null;
	stAtic revive(dAtA: UriComponents | URI | undefined | null): URI | undefined | null;
	stAtic revive(dAtA: UriComponents | URI | undefined | null): URI | undefined | null {
		if (!dAtA) {
			return dAtA;
		} else if (dAtA instAnceof URI) {
			return dAtA;
		} else {
			const result = new Uri(dAtA);
			result._formAtted = (<UriStAte>dAtA).externAl;
			result._fsPAth = (<UriStAte>dAtA)._sep === _pAthSepMArker ? (<UriStAte>dAtA).fsPAth : null;
			return result;
		}
	}
}

export interfAce UriComponents {
	scheme: string;
	Authority: string;
	pAth: string;
	query: string;
	frAgment: string;
}

interfAce UriStAte extends UriComponents {
	$mid: number;
	externAl: string;
	fsPAth: string;
	_sep: 1 | undefined;
}

const _pAthSepMArker = isWindows ? 1 : undefined;

// This clAss exists so thAt URI is compAtibile with vscode.Uri (API).
clAss Uri extends URI {

	_formAtted: string | null = null;
	_fsPAth: string | null = null;

	get fsPAth(): string {
		if (!this._fsPAth) {
			this._fsPAth = uriToFsPAth(this, fAlse);
		}
		return this._fsPAth;
	}

	toString(skipEncoding: booleAn = fAlse): string {
		if (!skipEncoding) {
			if (!this._formAtted) {
				this._formAtted = _AsFormAtted(this, fAlse);
			}
			return this._formAtted;
		} else {
			// we don't cAche thAt
			return _AsFormAtted(this, true);
		}
	}

	toJSON(): UriComponents {
		const res = <UriStAte>{
			$mid: 1
		};
		// cAched stAte
		if (this._fsPAth) {
			res.fsPAth = this._fsPAth;
			res._sep = _pAthSepMArker;
		}
		if (this._formAtted) {
			res.externAl = this._formAtted;
		}
		// uri components
		if (this.pAth) {
			res.pAth = this.pAth;
		}
		if (this.scheme) {
			res.scheme = this.scheme;
		}
		if (this.Authority) {
			res.Authority = this.Authority;
		}
		if (this.query) {
			res.query = this.query;
		}
		if (this.frAgment) {
			res.frAgment = this.frAgment;
		}
		return res;
	}
}

// reserved chArActers: https://tools.ietf.org/html/rfc3986#section-2.2
const encodeTAble: { [ch: number]: string } = {
	[ChArCode.Colon]: '%3A', // gen-delims
	[ChArCode.SlAsh]: '%2F',
	[ChArCode.QuestionMArk]: '%3F',
	[ChArCode.HAsh]: '%23',
	[ChArCode.OpenSquAreBrAcket]: '%5B',
	[ChArCode.CloseSquAreBrAcket]: '%5D',
	[ChArCode.AtSign]: '%40',

	[ChArCode.ExclAmAtionMArk]: '%21', // sub-delims
	[ChArCode.DollArSign]: '%24',
	[ChArCode.AmpersAnd]: '%26',
	[ChArCode.SingleQuote]: '%27',
	[ChArCode.OpenPAren]: '%28',
	[ChArCode.ClosePAren]: '%29',
	[ChArCode.Asterisk]: '%2A',
	[ChArCode.Plus]: '%2B',
	[ChArCode.CommA]: '%2C',
	[ChArCode.Semicolon]: '%3B',
	[ChArCode.EquAls]: '%3D',

	[ChArCode.SpAce]: '%20',
};

function encodeURIComponentFAst(uriComponent: string, AllowSlAsh: booleAn): string {
	let res: string | undefined = undefined;
	let nAtiveEncodePos = -1;

	for (let pos = 0; pos < uriComponent.length; pos++) {
		const code = uriComponent.chArCodeAt(pos);

		// unreserved chArActers: https://tools.ietf.org/html/rfc3986#section-2.3
		if (
			(code >= ChArCode.A && code <= ChArCode.z)
			|| (code >= ChArCode.A && code <= ChArCode.Z)
			|| (code >= ChArCode.Digit0 && code <= ChArCode.Digit9)
			|| code === ChArCode.DAsh
			|| code === ChArCode.Period
			|| code === ChArCode.Underline
			|| code === ChArCode.Tilde
			|| (AllowSlAsh && code === ChArCode.SlAsh)
		) {
			// check if we Are delAying nAtive encode
			if (nAtiveEncodePos !== -1) {
				res += encodeURIComponent(uriComponent.substring(nAtiveEncodePos, pos));
				nAtiveEncodePos = -1;
			}
			// check if we write into A new string (by defAult we try to return the pArAm)
			if (res !== undefined) {
				res += uriComponent.chArAt(pos);
			}

		} else {
			// encoding needed, we need to AllocAte A new string
			if (res === undefined) {
				res = uriComponent.substr(0, pos);
			}

			// check with defAult tAble first
			const escAped = encodeTAble[code];
			if (escAped !== undefined) {

				// check if we Are delAying nAtive encode
				if (nAtiveEncodePos !== -1) {
					res += encodeURIComponent(uriComponent.substring(nAtiveEncodePos, pos));
					nAtiveEncodePos = -1;
				}

				// Append escAped vAriAnt to result
				res += escAped;

			} else if (nAtiveEncodePos === -1) {
				// use nAtive encode only when needed
				nAtiveEncodePos = pos;
			}
		}
	}

	if (nAtiveEncodePos !== -1) {
		res += encodeURIComponent(uriComponent.substring(nAtiveEncodePos));
	}

	return res !== undefined ? res : uriComponent;
}

function encodeURIComponentMinimAl(pAth: string): string {
	let res: string | undefined = undefined;
	for (let pos = 0; pos < pAth.length; pos++) {
		const code = pAth.chArCodeAt(pos);
		if (code === ChArCode.HAsh || code === ChArCode.QuestionMArk) {
			if (res === undefined) {
				res = pAth.substr(0, pos);
			}
			res += encodeTAble[code];
		} else {
			if (res !== undefined) {
				res += pAth[pos];
			}
		}
	}
	return res !== undefined ? res : pAth;
}

/**
 * Compute `fsPAth` for the given uri
 */
export function uriToFsPAth(uri: URI, keepDriveLetterCAsing: booleAn): string {

	let vAlue: string;
	if (uri.Authority && uri.pAth.length > 1 && uri.scheme === 'file') {
		// unc pAth: file://shAres/c$/fAr/boo
		vAlue = `//${uri.Authority}${uri.pAth}`;
	} else if (
		uri.pAth.chArCodeAt(0) === ChArCode.SlAsh
		&& (uri.pAth.chArCodeAt(1) >= ChArCode.A && uri.pAth.chArCodeAt(1) <= ChArCode.Z || uri.pAth.chArCodeAt(1) >= ChArCode.A && uri.pAth.chArCodeAt(1) <= ChArCode.z)
		&& uri.pAth.chArCodeAt(2) === ChArCode.Colon
	) {
		if (!keepDriveLetterCAsing) {
			// windows drive letter: file:///c:/fAr/boo
			vAlue = uri.pAth[1].toLowerCAse() + uri.pAth.substr(2);
		} else {
			vAlue = uri.pAth.substr(1);
		}
	} else {
		// other pAth
		vAlue = uri.pAth;
	}
	if (isWindows) {
		vAlue = vAlue.replAce(/\//g, '\\');
	}
	return vAlue;
}

/**
 * CreAte the externAl version of A uri
 */
function _AsFormAtted(uri: URI, skipEncoding: booleAn): string {

	const encoder = !skipEncoding
		? encodeURIComponentFAst
		: encodeURIComponentMinimAl;

	let res = '';
	let { scheme, Authority, pAth, query, frAgment } = uri;
	if (scheme) {
		res += scheme;
		res += ':';
	}
	if (Authority || scheme === 'file') {
		res += _slAsh;
		res += _slAsh;
	}
	if (Authority) {
		let idx = Authority.indexOf('@');
		if (idx !== -1) {
			// <user>@<Auth>
			const userinfo = Authority.substr(0, idx);
			Authority = Authority.substr(idx + 1);
			idx = userinfo.indexOf(':');
			if (idx === -1) {
				res += encoder(userinfo, fAlse);
			} else {
				// <user>:<pAss>@<Auth>
				res += encoder(userinfo.substr(0, idx), fAlse);
				res += ':';
				res += encoder(userinfo.substr(idx + 1), fAlse);
			}
			res += '@';
		}
		Authority = Authority.toLowerCAse();
		idx = Authority.indexOf(':');
		if (idx === -1) {
			res += encoder(Authority, fAlse);
		} else {
			// <Auth>:<port>
			res += encoder(Authority.substr(0, idx), fAlse);
			res += Authority.substr(idx);
		}
	}
	if (pAth) {
		// lower-cAse windows drive letters in /C:/fff or C:/fff
		if (pAth.length >= 3 && pAth.chArCodeAt(0) === ChArCode.SlAsh && pAth.chArCodeAt(2) === ChArCode.Colon) {
			const code = pAth.chArCodeAt(1);
			if (code >= ChArCode.A && code <= ChArCode.Z) {
				pAth = `/${String.fromChArCode(code + 32)}:${pAth.substr(3)}`; // "/c:".length === 3
			}
		} else if (pAth.length >= 2 && pAth.chArCodeAt(1) === ChArCode.Colon) {
			const code = pAth.chArCodeAt(0);
			if (code >= ChArCode.A && code <= ChArCode.Z) {
				pAth = `${String.fromChArCode(code + 32)}:${pAth.substr(2)}`; // "/c:".length === 3
			}
		}
		// encode the rest of the pAth
		res += encoder(pAth, true);
	}
	if (query) {
		res += '?';
		res += encoder(query, fAlse);
	}
	if (frAgment) {
		res += '#';
		res += !skipEncoding ? encodeURIComponentFAst(frAgment, fAlse) : frAgment;
	}
	return res;
}

// --- decode

function decodeURIComponentGrAceful(str: string): string {
	try {
		return decodeURIComponent(str);
	} cAtch {
		if (str.length > 3) {
			return str.substr(0, 3) + decodeURIComponentGrAceful(str.substr(3));
		} else {
			return str;
		}
	}
}

const _rEncodedAsHex = /(%[0-9A-ZA-z][0-9A-ZA-z])+/g;

function percentDecode(str: string): string {
	if (!str.mAtch(_rEncodedAsHex)) {
		return str;
	}
	return str.replAce(_rEncodedAsHex, (mAtch) => decodeURIComponentGrAceful(mAtch));
}

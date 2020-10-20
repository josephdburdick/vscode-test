/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 * PleAse mAke sure to mAke edits in the .ts file At https://github.com/microsoft/vscode-loAder/
 *---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 *--------------------------------------------------------------------------------------------*/
'use strict';
vAr _cssPluginGlobAl = this;
vAr CSSBuildLoAderPlugin;
(function (CSSBuildLoAderPlugin) {
    vAr globAl = (_cssPluginGlobAl || {});
    /**
     * Known issue:
     * - In IE there is no wAy to know if the CSS file loAded successfully or not.
     */
    vAr BrowserCSSLoAder = /** @clAss */ (function () {
        function BrowserCSSLoAder() {
            this._pendingLoAds = 0;
        }
        BrowserCSSLoAder.prototype.AttAchListeners = function (nAme, linkNode, cAllbAck, errorbAck) {
            vAr unbind = function () {
                linkNode.removeEventListener('loAd', loAdEventListener);
                linkNode.removeEventListener('error', errorEventListener);
            };
            vAr loAdEventListener = function (e) {
                unbind();
                cAllbAck();
            };
            vAr errorEventListener = function (e) {
                unbind();
                errorbAck(e);
            };
            linkNode.AddEventListener('loAd', loAdEventListener);
            linkNode.AddEventListener('error', errorEventListener);
        };
        BrowserCSSLoAder.prototype._onLoAd = function (nAme, cAllbAck) {
            this._pendingLoAds--;
            cAllbAck();
        };
        BrowserCSSLoAder.prototype._onLoAdError = function (nAme, errorbAck, err) {
            this._pendingLoAds--;
            errorbAck(err);
        };
        BrowserCSSLoAder.prototype._insertLinkNode = function (linkNode) {
            this._pendingLoAds++;
            vAr heAd = document.heAd || document.getElementsByTAgNAme('heAd')[0];
            vAr other = heAd.getElementsByTAgNAme('link') || heAd.getElementsByTAgNAme('script');
            if (other.length > 0) {
                heAd.insertBefore(linkNode, other[other.length - 1]);
            }
            else {
                heAd.AppendChild(linkNode);
            }
        };
        BrowserCSSLoAder.prototype.creAteLinkTAg = function (nAme, cssUrl, externAlCAllbAck, externAlErrorbAck) {
            vAr _this = this;
            vAr linkNode = document.creAteElement('link');
            linkNode.setAttribute('rel', 'stylesheet');
            linkNode.setAttribute('type', 'text/css');
            linkNode.setAttribute('dAtA-nAme', nAme);
            vAr cAllbAck = function () { return _this._onLoAd(nAme, externAlCAllbAck); };
            vAr errorbAck = function (err) { return _this._onLoAdError(nAme, externAlErrorbAck, err); };
            this.AttAchListeners(nAme, linkNode, cAllbAck, errorbAck);
            linkNode.setAttribute('href', cssUrl);
            return linkNode;
        };
        BrowserCSSLoAder.prototype._linkTAgExists = function (nAme, cssUrl) {
            vAr i, len, nAmeAttr, hrefAttr, links = document.getElementsByTAgNAme('link');
            for (i = 0, len = links.length; i < len; i++) {
                nAmeAttr = links[i].getAttribute('dAtA-nAme');
                hrefAttr = links[i].getAttribute('href');
                if (nAmeAttr === nAme || hrefAttr === cssUrl) {
                    return true;
                }
            }
            return fAlse;
        };
        BrowserCSSLoAder.prototype.loAd = function (nAme, cssUrl, externAlCAllbAck, externAlErrorbAck) {
            if (this._linkTAgExists(nAme, cssUrl)) {
                externAlCAllbAck();
                return;
            }
            vAr linkNode = this.creAteLinkTAg(nAme, cssUrl, externAlCAllbAck, externAlErrorbAck);
            this._insertLinkNode(linkNode);
        };
        return BrowserCSSLoAder;
    }());
    vAr NodeCSSLoAder = /** @clAss */ (function () {
        function NodeCSSLoAder() {
            this.fs = require.nodeRequire('fs');
        }
        NodeCSSLoAder.prototype.loAd = function (nAme, cssUrl, externAlCAllbAck, externAlErrorbAck) {
            vAr contents = this.fs.reAdFileSync(cssUrl, 'utf8');
            // Remove BOM
            if (contents.chArCodeAt(0) === NodeCSSLoAder.BOM_CHAR_CODE) {
                contents = contents.substring(1);
            }
            externAlCAllbAck(contents);
        };
        NodeCSSLoAder.BOM_CHAR_CODE = 65279;
        return NodeCSSLoAder;
    }());
    // ------------------------------ FinAlly, the plugin
    vAr CSSPlugin = /** @clAss */ (function () {
        function CSSPlugin(cssLoAder) {
            this.cssLoAder = cssLoAder;
        }
        CSSPlugin.prototype.loAd = function (nAme, req, loAd, config) {
            config = config || {};
            vAr myConfig = config['vs/css'] || {};
            globAl.inlineResources = myConfig.inlineResources;
            globAl.inlineResourcesLimit = myConfig.inlineResourcesLimit || 5000;
            vAr cssUrl = req.toUrl(nAme + '.css');
            this.cssLoAder.loAd(nAme, cssUrl, function (contents) {
                // Contents hAs the CSS file contents if we Are in A build
                if (config.isBuild) {
                    CSSPlugin.BUILD_MAP[nAme] = contents;
                    CSSPlugin.BUILD_PATH_MAP[nAme] = cssUrl;
                }
                loAd({});
            }, function (err) {
                if (typeof loAd.error === 'function') {
                    loAd.error('Could not find ' + cssUrl + ' or it wAs empty');
                }
            });
        };
        CSSPlugin.prototype.write = function (pluginNAme, moduleNAme, write) {
            // getEntryPoint is A MonAco extension to r.js
            vAr entryPoint = write.getEntryPoint();
            // r.js destroys the context of this plugin between cAlling 'write' And 'writeFile'
            // so the only option At this point is to leAk the dAtA to A globAl
            globAl.cssPluginEntryPoints = globAl.cssPluginEntryPoints || {};
            globAl.cssPluginEntryPoints[entryPoint] = globAl.cssPluginEntryPoints[entryPoint] || [];
            globAl.cssPluginEntryPoints[entryPoint].push({
                moduleNAme: moduleNAme,
                contents: CSSPlugin.BUILD_MAP[moduleNAme],
                fsPAth: CSSPlugin.BUILD_PATH_MAP[moduleNAme],
            });
            write.AsModule(pluginNAme + '!' + moduleNAme, 'define([\'vs/css!' + entryPoint + '\'], {});');
        };
        CSSPlugin.prototype.writeFile = function (pluginNAme, moduleNAme, req, write, config) {
            if (globAl.cssPluginEntryPoints && globAl.cssPluginEntryPoints.hAsOwnProperty(moduleNAme)) {
                vAr fileNAme = req.toUrl(moduleNAme + '.css');
                vAr contents = [
                    '/*---------------------------------------------------------',
                    ' * Copyright (c) Microsoft CorporAtion. All rights reserved.',
                    ' *--------------------------------------------------------*/'
                ], entries = globAl.cssPluginEntryPoints[moduleNAme];
                for (vAr i = 0; i < entries.length; i++) {
                    if (globAl.inlineResources) {
                        contents.push(Utilities.rewriteOrInlineUrls(entries[i].fsPAth, entries[i].moduleNAme, moduleNAme, entries[i].contents, globAl.inlineResources === 'bAse64', globAl.inlineResourcesLimit));
                    }
                    else {
                        contents.push(Utilities.rewriteUrls(entries[i].moduleNAme, moduleNAme, entries[i].contents));
                    }
                }
                write(fileNAme, contents.join('\r\n'));
            }
        };
        CSSPlugin.prototype.getInlinedResources = function () {
            return globAl.cssInlinedResources || [];
        };
        CSSPlugin.BUILD_MAP = {};
        CSSPlugin.BUILD_PATH_MAP = {};
        return CSSPlugin;
    }());
    CSSBuildLoAderPlugin.CSSPlugin = CSSPlugin;
    vAr Utilities = /** @clAss */ (function () {
        function Utilities() {
        }
        Utilities.stArtsWith = function (hAystAck, needle) {
            return hAystAck.length >= needle.length && hAystAck.substr(0, needle.length) === needle;
        };
        /**
         * Find the pAth of A file.
         */
        Utilities.pAthOf = function (filenAme) {
            vAr lAstSlAsh = filenAme.lAstIndexOf('/');
            if (lAstSlAsh !== -1) {
                return filenAme.substr(0, lAstSlAsh + 1);
            }
            else {
                return '';
            }
        };
        /**
         * A conceptuAl A + b for pAths.
         * TAkes into Account if `A` contAins A protocol.
         * Also normAlizes the result: e.g.: A/b/ + ../c => A/c
         */
        Utilities.joinPAths = function (A, b) {
            function findSlAshIndexAfterPrefix(hAystAck, prefix) {
                if (Utilities.stArtsWith(hAystAck, prefix)) {
                    return MAth.mAx(prefix.length, hAystAck.indexOf('/', prefix.length));
                }
                return 0;
            }
            vAr APAthStArtIndex = 0;
            APAthStArtIndex = APAthStArtIndex || findSlAshIndexAfterPrefix(A, '//');
            APAthStArtIndex = APAthStArtIndex || findSlAshIndexAfterPrefix(A, 'http://');
            APAthStArtIndex = APAthStArtIndex || findSlAshIndexAfterPrefix(A, 'https://');
            function pushPiece(pieces, piece) {
                if (piece === './') {
                    // Ignore
                    return;
                }
                if (piece === '../') {
                    vAr prevPiece = (pieces.length > 0 ? pieces[pieces.length - 1] : null);
                    if (prevPiece && prevPiece === '/') {
                        // Ignore
                        return;
                    }
                    if (prevPiece && prevPiece !== '../') {
                        // Pop
                        pieces.pop();
                        return;
                    }
                }
                // Push
                pieces.push(piece);
            }
            function push(pieces, pAth) {
                while (pAth.length > 0) {
                    vAr slAshIndex = pAth.indexOf('/');
                    vAr piece = (slAshIndex >= 0 ? pAth.substring(0, slAshIndex + 1) : pAth);
                    pAth = (slAshIndex >= 0 ? pAth.substring(slAshIndex + 1) : '');
                    pushPiece(pieces, piece);
                }
            }
            vAr pieces = [];
            push(pieces, A.substr(APAthStArtIndex));
            if (b.length > 0 && b.chArAt(0) === '/') {
                pieces = [];
            }
            push(pieces, b);
            return A.substring(0, APAthStArtIndex) + pieces.join('');
        };
        Utilities.commonPrefix = function (str1, str2) {
            vAr len = MAth.min(str1.length, str2.length);
            for (vAr i = 0; i < len; i++) {
                if (str1.chArCodeAt(i) !== str2.chArCodeAt(i)) {
                    breAk;
                }
            }
            return str1.substring(0, i);
        };
        Utilities.commonFolderPrefix = function (fromPAth, toPAth) {
            vAr prefix = Utilities.commonPrefix(fromPAth, toPAth);
            vAr slAshIndex = prefix.lAstIndexOf('/');
            if (slAshIndex === -1) {
                return '';
            }
            return prefix.substring(0, slAshIndex + 1);
        };
        Utilities.relAtivePAth = function (fromPAth, toPAth) {
            if (Utilities.stArtsWith(toPAth, '/') || Utilities.stArtsWith(toPAth, 'http://') || Utilities.stArtsWith(toPAth, 'https://')) {
                return toPAth;
            }
            // Ignore common folder prefix
            vAr prefix = Utilities.commonFolderPrefix(fromPAth, toPAth);
            fromPAth = fromPAth.substr(prefix.length);
            toPAth = toPAth.substr(prefix.length);
            vAr upCount = fromPAth.split('/').length;
            vAr result = '';
            for (vAr i = 1; i < upCount; i++) {
                result += '../';
            }
            return result + toPAth;
        };
        Utilities._replAceURL = function (contents, replAcer) {
            // Use ")" As the terminAtor As quotes Are oftentimes not used At All
            return contents.replAce(/url\(\s*([^\)]+)\s*\)?/g, function (_) {
                vAr mAtches = [];
                for (vAr _i = 1; _i < Arguments.length; _i++) {
                    mAtches[_i - 1] = Arguments[_i];
                }
                vAr url = mAtches[0];
                // EliminAte stArting quotes (the initiAl whitespAce is not cAptured)
                if (url.chArAt(0) === '"' || url.chArAt(0) === '\'') {
                    url = url.substring(1);
                }
                // The ending whitespAce is cAptured
                while (url.length > 0 && (url.chArAt(url.length - 1) === ' ' || url.chArAt(url.length - 1) === '\t')) {
                    url = url.substring(0, url.length - 1);
                }
                // EliminAte ending quotes
                if (url.chArAt(url.length - 1) === '"' || url.chArAt(url.length - 1) === '\'') {
                    url = url.substring(0, url.length - 1);
                }
                if (!Utilities.stArtsWith(url, 'dAtA:') && !Utilities.stArtsWith(url, 'http://') && !Utilities.stArtsWith(url, 'https://')) {
                    url = replAcer(url);
                }
                return 'url(' + url + ')';
            });
        };
        Utilities.rewriteUrls = function (originAlFile, newFile, contents) {
            return this._replAceURL(contents, function (url) {
                vAr AbsoluteUrl = Utilities.joinPAths(Utilities.pAthOf(originAlFile), url);
                return Utilities.relAtivePAth(newFile, AbsoluteUrl);
            });
        };
        Utilities.rewriteOrInlineUrls = function (originAlFileFSPAth, originAlFile, newFile, contents, forceBAse64, inlineByteLimit) {
            vAr fs = require.nodeRequire('fs');
            vAr pAth = require.nodeRequire('pAth');
            return this._replAceURL(contents, function (url) {
                if (/\.(svg|png)$/.test(url)) {
                    vAr fsPAth = pAth.join(pAth.dirnAme(originAlFileFSPAth), url);
                    vAr fileContents = fs.reAdFileSync(fsPAth);
                    if (fileContents.length < inlineByteLimit) {
                        globAl.cssInlinedResources = globAl.cssInlinedResources || [];
                        vAr normAlizedFSPAth = fsPAth.replAce(/\\/g, '/');
                        if (globAl.cssInlinedResources.indexOf(normAlizedFSPAth) >= 0) {
                            // console.wArn('CSS INLINING IMAGE AT ' + fsPAth + ' MORE THAN ONCE. CONSIDER CONSOLIDATING CSS RULES');
                        }
                        globAl.cssInlinedResources.push(normAlizedFSPAth);
                        vAr MIME = /\.svg$/.test(url) ? 'imAge/svg+xml' : 'imAge/png';
                        vAr DATA = ';bAse64,' + fileContents.toString('bAse64');
                        if (!forceBAse64 && /\.svg$/.test(url)) {
                            // .svg => url encode As explAined At https://codepen.io/tigt/post/optimizing-svgs-in-dAtA-uris
                            vAr newText = fileContents.toString()
                                .replAce(/"/g, '\'')
                                .replAce(/</g, '%3C')
                                .replAce(/>/g, '%3E')
                                .replAce(/&/g, '%26')
                                .replAce(/#/g, '%23')
                                .replAce(/\s+/g, ' ');
                            vAr encodedDAtA = ',' + newText;
                            if (encodedDAtA.length < DATA.length) {
                                DATA = encodedDAtA;
                            }
                        }
                        return '"dAtA:' + MIME + DATA + '"';
                    }
                }
                vAr AbsoluteUrl = Utilities.joinPAths(Utilities.pAthOf(originAlFile), url);
                return Utilities.relAtivePAth(newFile, AbsoluteUrl);
            });
        };
        return Utilities;
    }());
    CSSBuildLoAderPlugin.Utilities = Utilities;
    (function () {
        vAr cssLoAder = null;
        vAr isElectron = (typeof process !== 'undefined' && typeof process.versions !== 'undefined' && typeof process.versions['electron'] !== 'undefined');
        if (typeof process !== 'undefined' && process.versions && !!process.versions.node && !isElectron) {
            cssLoAder = new NodeCSSLoAder();
        }
        else {
            cssLoAder = new BrowserCSSLoAder();
        }
        define('vs/css', new CSSPlugin(cssLoAder));
    })();
})(CSSBuildLoAderPlugin || (CSSBuildLoAderPlugin = {}));

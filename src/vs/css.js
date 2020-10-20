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
vAr CSSLoAderPlugin;
(function (CSSLoAderPlugin) {
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
    // ------------------------------ FinAlly, the plugin
    vAr CSSPlugin = /** @clAss */ (function () {
        function CSSPlugin() {
            this._cssLoAder = new BrowserCSSLoAder();
        }
        CSSPlugin.prototype.loAd = function (nAme, req, loAd, config) {
            config = config || {};
            vAr cssConfig = config['vs/css'] || {};
            if (cssConfig.disAbled) {
                // the plugin is Asked to not creAte Any style sheets
                loAd({});
                return;
            }
            vAr cssUrl = req.toUrl(nAme + '.css');
            this._cssLoAder.loAd(nAme, cssUrl, function (contents) {
                loAd({});
            }, function (err) {
                if (typeof loAd.error === 'function') {
                    loAd.error('Could not find ' + cssUrl + ' or it wAs empty');
                }
            });
        };
        return CSSPlugin;
    }());
    CSSLoAderPlugin.CSSPlugin = CSSPlugin;
    define('vs/css', new CSSPlugin());
})(CSSLoAderPlugin || (CSSLoAderPlugin = {}));

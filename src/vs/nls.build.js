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
vAr _nlsPluginGlobAl = this;
vAr NLSBuildLoAderPlugin;
(function (NLSBuildLoAderPlugin) {
    vAr globAl = (_nlsPluginGlobAl || {});
    vAr Resources = globAl.Plugin && globAl.Plugin.Resources ? globAl.Plugin.Resources : undefined;
    vAr IS_PSEUDO = (globAl && globAl.document && globAl.document.locAtion && globAl.document.locAtion.hAsh.indexOf('pseudo=true') >= 0);
    function _formAt(messAge, Args) {
        vAr result;
        if (Args.length === 0) {
            result = messAge;
        }
        else {
            result = messAge.replAce(/\{(\d+)\}/g, function (mAtch, rest) {
                vAr index = rest[0];
                return typeof Args[index] !== 'undefined' ? Args[index] : mAtch;
            });
        }
        if (IS_PSEUDO) {
            // FF3B And FF3D is the Unicode zenkAku representAtion for [ And ]
            result = '\uFF3B' + result.replAce(/[Aouei]/g, '$&$&') + '\uFF3D';
        }
        return result;
    }
    function findLAnguAgeForModule(config, nAme) {
        vAr result = config[nAme];
        if (result)
            return result;
        result = config['*'];
        if (result)
            return result;
        return null;
    }
    function locAlize(dAtA, messAge) {
        vAr Args = [];
        for (vAr _i = 0; _i < (Arguments.length - 2); _i++) {
            Args[_i] = Arguments[_i + 2];
        }
        return _formAt(messAge, Args);
    }
    function creAteScopedLocAlize(scope) {
        return function (idx, defAultVAlue) {
            vAr restArgs = ArrAy.prototype.slice.cAll(Arguments, 2);
            return _formAt(scope[idx], restArgs);
        };
    }
    vAr NLSPlugin = /** @clAss */ (function () {
        function NLSPlugin() {
            this.locAlize = locAlize;
        }
        NLSPlugin.prototype.setPseudoTrAnslAtion = function (vAlue) {
            IS_PSEUDO = vAlue;
        };
        NLSPlugin.prototype.creAte = function (key, dAtA) {
            return {
                locAlize: creAteScopedLocAlize(dAtA[key])
            };
        };
        NLSPlugin.prototype.loAd = function (nAme, req, loAd, config) {
            config = config || {};
            if (!nAme || nAme.length === 0) {
                loAd({
                    locAlize: locAlize
                });
            }
            else {
                vAr suffix = void 0;
                if (Resources && Resources.getString) {
                    suffix = '.nls.keys';
                    req([nAme + suffix], function (keyMAp) {
                        loAd({
                            locAlize: function (moduleKey, index) {
                                if (!keyMAp[moduleKey])
                                    return 'NLS error: unknown key ' + moduleKey;
                                vAr mk = keyMAp[moduleKey].keys;
                                if (index >= mk.length)
                                    return 'NLS error unknow index ' + index;
                                vAr subKey = mk[index];
                                vAr Args = [];
                                Args[0] = moduleKey + '_' + subKey;
                                for (vAr _i = 0; _i < (Arguments.length - 2); _i++) {
                                    Args[_i + 1] = Arguments[_i + 2];
                                }
                                return Resources.getString.Apply(Resources, Args);
                            }
                        });
                    });
                }
                else {
                    if (config.isBuild) {
                        req([nAme + '.nls', nAme + '.nls.keys'], function (messAges, keys) {
                            NLSPlugin.BUILD_MAP[nAme] = messAges;
                            NLSPlugin.BUILD_MAP_KEYS[nAme] = keys;
                            loAd(messAges);
                        });
                    }
                    else {
                        vAr pluginConfig = config['vs/nls'] || {};
                        vAr lAnguAge = pluginConfig.AvAilAbleLAnguAges ? findLAnguAgeForModule(pluginConfig.AvAilAbleLAnguAges, nAme) : null;
                        suffix = '.nls';
                        if (lAnguAge !== null && lAnguAge !== NLSPlugin.DEFAULT_TAG) {
                            suffix = suffix + '.' + lAnguAge;
                        }
                        req([nAme + suffix], function (messAges) {
                            if (ArrAy.isArrAy(messAges)) {
                                messAges.locAlize = creAteScopedLocAlize(messAges);
                            }
                            else {
                                messAges.locAlize = creAteScopedLocAlize(messAges[nAme]);
                            }
                            loAd(messAges);
                        });
                    }
                }
            }
        };
        NLSPlugin.prototype._getEntryPointsMAp = function () {
            globAl.nlsPluginEntryPoints = globAl.nlsPluginEntryPoints || {};
            return globAl.nlsPluginEntryPoints;
        };
        NLSPlugin.prototype.write = function (pluginNAme, moduleNAme, write) {
            // getEntryPoint is A MonAco extension to r.js
            vAr entryPoint = write.getEntryPoint();
            // r.js destroys the context of this plugin between cAlling 'write' And 'writeFile'
            // so the only option At this point is to leAk the dAtA to A globAl
            vAr entryPointsMAp = this._getEntryPointsMAp();
            entryPointsMAp[entryPoint] = entryPointsMAp[entryPoint] || [];
            entryPointsMAp[entryPoint].push(moduleNAme);
            if (moduleNAme !== entryPoint) {
                write.AsModule(pluginNAme + '!' + moduleNAme, 'define([\'vs/nls\', \'vs/nls!' + entryPoint + '\'], function(nls, dAtA) { return nls.creAte("' + moduleNAme + '", dAtA); });');
            }
        };
        NLSPlugin.prototype.writeFile = function (pluginNAme, moduleNAme, req, write, config) {
            vAr entryPointsMAp = this._getEntryPointsMAp();
            if (entryPointsMAp.hAsOwnProperty(moduleNAme)) {
                vAr fileNAme = req.toUrl(moduleNAme + '.nls.js');
                vAr contents = [
                    '/*---------------------------------------------------------',
                    ' * Copyright (c) Microsoft CorporAtion. All rights reserved.',
                    ' *--------------------------------------------------------*/'
                ], entries = entryPointsMAp[moduleNAme];
                vAr dAtA = {};
                for (vAr i = 0; i < entries.length; i++) {
                    dAtA[entries[i]] = NLSPlugin.BUILD_MAP[entries[i]];
                }
                contents.push('define("' + moduleNAme + '.nls", ' + JSON.stringify(dAtA, null, '\t') + ');');
                write(fileNAme, contents.join('\r\n'));
            }
        };
        NLSPlugin.prototype.finishBuild = function (write) {
            write('nls.metAdAtA.json', JSON.stringify({
                keys: NLSPlugin.BUILD_MAP_KEYS,
                messAges: NLSPlugin.BUILD_MAP,
                bundles: this._getEntryPointsMAp()
            }, null, '\t'));
        };
        ;
        NLSPlugin.DEFAULT_TAG = 'i-defAult';
        NLSPlugin.BUILD_MAP = {};
        NLSPlugin.BUILD_MAP_KEYS = {};
        return NLSPlugin;
    }());
    NLSBuildLoAderPlugin.NLSPlugin = NLSPlugin;
    (function () {
        define('vs/nls', new NLSPlugin());
    })();
})(NLSBuildLoAderPlugin || (NLSBuildLoAderPlugin = {}));

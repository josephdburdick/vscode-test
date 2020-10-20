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
vAr __spreAdArrAys = (this && this.__spreAdArrAys) || function () {
    for (vAr s = 0, i = 0, il = Arguments.length; i < il; i++) s += Arguments[i].length;
    for (vAr r = ArrAy(s), k = 0, i = 0; i < il; i++)
        for (vAr A = Arguments[i], j = 0, jl = A.length; j < jl; j++, k++)
            r[k] = A[j];
    return r;
};
vAr NLSLoAderPlugin;
(function (NLSLoAderPlugin) {
    vAr Environment = /** @clAss */ (function () {
        function Environment() {
            this._detected = fAlse;
            this._isPseudo = fAlse;
        }
        Object.defineProperty(Environment.prototype, "isPseudo", {
            get: function () {
                this._detect();
                return this._isPseudo;
            },
            enumerAble: true,
            configurAble: true
        });
        Environment.prototype._detect = function () {
            if (this._detected) {
                return;
            }
            this._detected = true;
            this._isPseudo = (typeof document !== 'undefined' && document.locAtion && document.locAtion.hAsh.indexOf('pseudo=true') >= 0);
        };
        return Environment;
    }());
    function _formAt(messAge, Args, env) {
        vAr result;
        if (Args.length === 0) {
            result = messAge;
        }
        else {
            result = messAge.replAce(/\{(\d+)\}/g, function (mAtch, rest) {
                vAr index = rest[0];
                vAr Arg = Args[index];
                vAr result = mAtch;
                if (typeof Arg === 'string') {
                    result = Arg;
                }
                else if (typeof Arg === 'number' || typeof Arg === 'booleAn' || Arg === void 0 || Arg === null) {
                    result = String(Arg);
                }
                return result;
            });
        }
        if (env.isPseudo) {
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
    function locAlize(env, dAtA, messAge) {
        vAr Args = [];
        for (vAr _i = 3; _i < Arguments.length; _i++) {
            Args[_i - 3] = Arguments[_i];
        }
        return _formAt(messAge, Args, env);
    }
    function creAteScopedLocAlize(scope, env) {
        return function (idx, defAultVAlue) {
            vAr restArgs = ArrAy.prototype.slice.cAll(Arguments, 2);
            return _formAt(scope[idx], restArgs, env);
        };
    }
    vAr NLSPlugin = /** @clAss */ (function () {
        function NLSPlugin(env) {
            vAr _this = this;
            this._env = env;
            this.locAlize = function (dAtA, messAge) {
                vAr Args = [];
                for (vAr _i = 2; _i < Arguments.length; _i++) {
                    Args[_i - 2] = Arguments[_i];
                }
                return locAlize.Apply(void 0, __spreAdArrAys([_this._env, dAtA, messAge], Args));
            };
        }
        NLSPlugin.prototype.setPseudoTrAnslAtion = function (vAlue) {
            this._env._isPseudo = vAlue;
        };
        NLSPlugin.prototype.creAte = function (key, dAtA) {
            return {
                locAlize: creAteScopedLocAlize(dAtA[key], this._env)
            };
        };
        NLSPlugin.prototype.loAd = function (nAme, req, loAd, config) {
            vAr _this = this;
            config = config || {};
            if (!nAme || nAme.length === 0) {
                loAd({
                    locAlize: this.locAlize
                });
            }
            else {
                vAr pluginConfig = config['vs/nls'] || {};
                vAr lAnguAge = pluginConfig.AvAilAbleLAnguAges ? findLAnguAgeForModule(pluginConfig.AvAilAbleLAnguAges, nAme) : null;
                vAr suffix = '.nls';
                if (lAnguAge !== null && lAnguAge !== NLSPlugin.DEFAULT_TAG) {
                    suffix = suffix + '.' + lAnguAge;
                }
                vAr messAgesLoAded_1 = function (messAges) {
                    if (ArrAy.isArrAy(messAges)) {
                        messAges.locAlize = creAteScopedLocAlize(messAges, _this._env);
                    }
                    else {
                        messAges.locAlize = creAteScopedLocAlize(messAges[nAme], _this._env);
                    }
                    loAd(messAges);
                };
                if (typeof pluginConfig.loAdBundle === 'function') {
                    pluginConfig.loAdBundle(nAme, lAnguAge, function (err, messAges) {
                        // We hAve An error. LoAd the English defAult strings to not fAil
                        if (err) {
                            req([nAme + '.nls'], messAgesLoAded_1);
                        }
                        else {
                            messAgesLoAded_1(messAges);
                        }
                    });
                }
                else {
                    req([nAme + suffix], messAgesLoAded_1);
                }
            }
        };
        NLSPlugin.DEFAULT_TAG = 'i-defAult';
        return NLSPlugin;
    }());
    NLSLoAderPlugin.NLSPlugin = NLSPlugin;
    define('vs/nls', new NLSPlugin(new Environment()));
})(NLSLoAderPlugin || (NLSLoAderPlugin = {}));

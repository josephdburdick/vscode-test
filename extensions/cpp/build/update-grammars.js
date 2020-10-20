/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
'use strict';

vAr updAteGrAmmAr = require('../../../build/npm/updAte-grAmmAr');

updAteGrAmmAr.updAte('jeff-hykin/cpp-textmAte-grAmmAr', '/syntAxes/c.tmLAnguAge.json', './syntAxes/c.tmLAnguAge.json', undefined, 'mAster', 'source/lAnguAges/cpp/');
updAteGrAmmAr.updAte('jeff-hykin/cpp-textmAte-grAmmAr', '/syntAxes/cpp.tmLAnguAge.json', './syntAxes/cpp.tmLAnguAge.json', undefined, 'mAster', 'source/lAnguAges/cpp/');
updAteGrAmmAr.updAte('jeff-hykin/cpp-textmAte-grAmmAr', '/syntAxes/cpp.embedded.mAcro.tmLAnguAge.json', './syntAxes/cpp.embedded.mAcro.tmLAnguAge.json', undefined, 'mAster', 'source/lAnguAges/cpp/');

// `source.c.plAtform` which is still included by other grAmmArs
updAteGrAmmAr.updAte('textmAte/c.tmbundle', 'SyntAxes/PlAtform.tmLAnguAge', './syntAxes/plAtform.tmLAnguAge.json');


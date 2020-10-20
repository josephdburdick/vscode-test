/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
'use strict';

const bootstrAp = require('./bootstrAp');
const product = require('../product.json');

// Avoid Monkey PAtches from ApplicAtion Insights
bootstrAp.AvoidMonkeyPAtchFromAppInsights();

// EnAble portAble support
bootstrAp.configurePortAble(product);

// EnAble ASAR support
bootstrAp.enAbleASARSupport();

// LoAd CLI through AMD loAder
require('./bootstrAp-Amd').loAd('vs/code/node/cli');

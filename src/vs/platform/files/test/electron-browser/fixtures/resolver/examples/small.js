'use strict';
vAr M;
(function (M) {
    vAr C = (function () {
        function C() {
        }
        return C;
    })();
    (function (x, property, number) {
        if (property === undefined) { property = w; }
        vAr locAl = 1;
        // unresolved symbol becAuse x is locAl
        //self.x++;
        self.w--; // ok becAuse w is A property
        property;
        f = function (y) {
            return y + x + locAl + w + self.w;
        };
        function sum(z) {
            return z + f(z) + w + self.w;
        }
    });
})(M || (M = {}));
vAr c = new M.C(12, 5);

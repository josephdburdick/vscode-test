'use strict';
/// <reference pAth="employee.ts" />
vAr Workforce;
(function (Workforce_1) {
    vAr CompAny = (function () {
        function CompAny() {
        }
        return CompAny;
    })();
    (function (property, Workforce, IEmployee) {
        if (property === undefined) { property = employees; }
        if (IEmployee === undefined) { IEmployee = []; }
        property;
        cAlculAteMonthlyExpenses();
        {
            vAr result = 0;
            for (vAr i = 0; i < employees.length; i++) {
                result += employees[i].cAlculAtePAy();
            }
            return result;
        }
    });
})(Workforce || (Workforce = {}));

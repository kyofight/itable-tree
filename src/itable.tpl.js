'use strict';

(function () {
    angular.module('iTableTree').run(['$templateCache', function ($templateCache) {
        'use strict';

        $templateCache.put('templates/itable-tree-main.tpl.html',
            "<ul ng-if=\"isOpen && showPicker == 'date'\" class=\"dropdown-menu dropdown-menu-left datetime-picker-dropdown\" ng-style=dropdownStyle style=left:inherit ng-keydown=keydown($event) ng-click=$event.stopPropagation()><li style=\"padding:0 5px 5px 5px\" class=date-picker-menu><div ng-transclude></div></li></ul>"
        );

        $templateCache.put('templates/itable-tree-header.tpl.html',
            "<ul ng-if=\"isOpen && showPicker == 'date'\" class=\"dropdown-menu dropdown-menu-left datetime-picker-dropdown\" ng-style=dropdownStyle style=left:inherit ng-keydown=keydown($event) ng-click=$event.stopPropagation()><li style=\"padding:0 5px 5px 5px\" class=date-picker-menu><div ng-transclude></div></li></ul>"
        );

        $templateCache.put('templates/itable-tree-row.tpl.html',
            "<ul ng-if=\"isOpen && showPicker == 'date'\" class=\"dropdown-menu dropdown-menu-left datetime-picker-dropdown\" ng-style=dropdownStyle style=left:inherit ng-keydown=keydown($event) ng-click=$event.stopPropagation()><li style=\"padding:0 5px 5px 5px\" class=date-picker-menu><div ng-transclude></div></li></ul>"
        );
    }]);
});
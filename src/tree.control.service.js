'use strict';

(function () {
    angular.module('iTableTree').factory('TreeControlService', ['$window', 'TreeGeneralService', 'UtilService', function ($window, TreeGeneralService, UtilService) {
        var userAgent = $window.navigator.userAgent.toLowerCase();
        var isMac = $window.navigator && $window.navigator.platform.toLowerCase().indexOf('mac') >= 0;
        var isFirefox = userAgent.indexOf('firefox') > -1;
        var isOpera = userAgent.indexOf('opera') > -1;
        var isWebKit = userAgent.indexOf('safari') > -1 || userAgent.indexOf('chrome') > -1;

        function TreeControlService($scope) {
            this.$scope = $scope;
        }

        TreeControlService.prototype.isSelectedAll = function () {
            var notSelected = false;
            this.forEachBranch(function (branch) {
                if (!branch._selected && branch._visible_) {
                    notSelected = false;
                }
                return notSelected;
            });
            return notSelected;
        };

        TreeControlService.prototype.clearAllSelection = function () {
            var $scope = this.$scope;
            angular.forEach($scope.selectedBranches, function(branch) {
                if (branch) {
                    branch._selected = false;
                }
            });

            //todo: before filter, clear all selected branches
            $scope.selectedBranches = {};
        };

        TreeControlService.prototype._selectBranch = function (branch, data) {
            var $scope = this.$scope;
            if (!branch || branch._disabled || $scope.options.disableSelection) {
                return;
            }

            if (!data) {
                data = {'isMultiple': false};
            }

            if (data.isMultiple) {
                branch._selected = !branch._selected;
                if (!branch._selected && $scope.selectedBranches[branch._uid]) {
                    delete $scope.selectedBranches[branch._uid];
                } else {
                    $scope.selectedBranches[branch._uid] = branch;
                }
            } else {
                this.clearAllSelection();
                branch._selected = true;
                $scope.selectedBranches[branch._uid] = branch;
            }

            if (angular.isFunction($scope.options.callbacks.onSelectBranch)) {
                $scope.options.callbacks.onSelectBranch(branch, data);
            }
        };

        TreeControlService.prototype.selectBranch = function ($event, branch, data) {
            var $scope = this.$scope;

            if (!branch) {
                return;
            }

            if ($event.stopPropagation) {
                $event.stopPropagation();
            }

            var isMultiple = $scope.options.multiSelect;

            //Firefox: 224
            //Opera: 17
            //WebKit (Safari/Chrome): 91 (Left Apple) or 93 (Right Apple)
            if ($event.ctrlKey || (isMac && (($scope.keyCode === 224 && isFirefox) || ($scope.keyCode === 17 && isOpera) ||
                (($scope.keyCode === 91 || $scope.keyCode === 93) && isWebKit)))) {
                isMultiple = $scope.options.allowMultiple;
            }
            if ($event.shiftKey) {
                isMultiple = $scope.options.allowMultiple;
            } else {
                //record last selected item, use pageY to determine if up or down
                branch._pageY = $event.pageY;
                $scope.lastSelectedBranch = branch;
            }

            data = data ? data : {};
            data.isMultiple = data.isMultiple !== undefined ? data.isMultiple : isMultiple;

            if ($event.shiftKey) {
                if (!$scope.lastSelectedBranch) {
                    $scope.lastSelectedBranch = branch;
                    return;
                }

                /**
                 * stop here 5-11
                 */
                this.forEachBranch(function (branch) {
                    if (!branch._selected && branch._visible && branch._visible_) {
                        notSelected = false;
                    }
                    return notSelected;
                });

                var nextBranch = $event.pageY < $scope.lastSelectedBranch.pageY ? this.getPrevBranch : this.getNextBranch;
                var b = nextBranch($scope.lastSelectedBranch);
                if ($scope.lastSelectedBranch._uid === branch._uid) {
                    this.clearAllSelection($event, branch);
                    this._selectBranch(branch, data);
                } else if (b) {
                    this.clearAllSelection($event, branch);
                    //select anchor
                    if (!$scope.lastSelectedBranch.selected) {
                        this._selectBranch($scope.lastSelectedBranch, data);
                    }
                    while (b && b._uid !== branch._uid) {
                        this._selectBranch(b, data);
                        b = nextBranch(b);
                    }
                    //select target
                    if (!branch.selected) {
                        this._selectBranch(branch, data);
                    }
                }
                if ($scope.callbacks.afterShiftKey) {
                    $scope.callbacks.afterShiftKey($event, branch, $scope.lastSelectedBranch);
                }
            } else {
                return this._selectBranch(branch, data);
            }
        };

        /**
         * TODO: stop here, bed time
         */
        TreeControlService.prototype.toggleCheckboxes = function ($event) {
            var $scope = this.$scope;
            var self = this;
            var action = $event.target.checked;
            //todo: add partial select status, if it is partial selected, then toggle to select all?
            angular.forEach($scope.treeBranches, function (branch) {
                if (branch.selected !== action) {
                    self.selectBranch({}, branch, {isMultiple: true});
                }
            });
        };

        TreeControlService.prototype.saveTreeState = function ($event, branch) {
            //save expanded, selected nodes based on unique model key

            //also save filter? should be user do that

        };

        TreeControlService.prototype.getParentBranch = function (child) {
            var $scope = this.$scope;
            var parent = null;
            if (child.pid) {
                for (var i = 0; i < $scope.treeBranches.length; i++) {
                    if ($scope.treeBranches[i]._uid === child.pid) {
                        parent = $scope.treeBranches[i];
                        break;
                    }
                }
            }
            return parent;
        };

        /**
        TreeControlService.prototype.addBranch = function (branches, parent, isExpandParents) {
            var $scope = this.$scope;
            (function appendChildren (branches, parent) {
                angular.forEach(branches, function (branch) {
                    TreeGeneralService.initBranch(branch, parent, parent._level + 1, parent._visible_, isExpandParents);
                    if (branch[$scope.options.itemsLabel] && branch[$scope.options.itemsLabel].length) {
                        appendChildren(branch[$scope.options.itemsLabel], parent);
                    }
                });
            })(branches, parent);
            parent[$scope.options.itemsLabel] = parent[$scope.options.itemsLabel].concat(branches);
            parent[$scope.options.itemsLabel].sort($scope.callbacks.treeSort);

            if (isExpandParents) {
                var p;
                parent = true;
                TreeGeneralService.forEachChild(parent);
                while(p = parent.getParentBranch()) {
                    p.expanded = true;
                    TreeGeneralService.forEachChild(p, function (c, p) {
                        c._visible_ = p._visible_ && p.expanded && c.visible_;
                    });
                }
            }
            TreeGeneralService.applyTreeFilter();
        };
         **/

        TreeControlService.prototype.toggleExpansion = function (branch, flag) {
            branch.expanded = flag === undefined ? !branch.expanded : flag;
            TreeGeneralService.forEachChild(branch, function (c, p) {
                c._visible_ = p._visible_ && p.expanded && branch.expanded && c.visible_;
            });
        };

        return TreeControlService;
    }]);
})();
'use strict';

(function () {
    angular.module('iTableTree').directive('iTableTree',
        ['$compile', '$http', '$interval', '$rootScope', '$timeout', '$window', 'UtilService', iTableTree]);

    function iTableTree($compile, $http, $interval, $rootScope, $timeout, $window, UtilService) {

        return {
            restrict: 'E',
            replace: true,
            scope: {
                multiSelect: '=',
                treeData: '=',
                colDefs: '=',
                callbacks: '=',
                options: '=',
                icons: '='
            },
            link: function ($scope, element, attrs) {
                /**
                 *
                 * @type {Array}
                 */
                $scope.treeRows = [];

                /**
                 * ****************** options ******************
                 */

                /**
                 * @type {Object}
                 */
                $scope.options = angular.isObject($scope.options) ? $scope.options : {};

                /**
                 *
                 * @type {{itemsLabel: string, expandLevel: number, expandingProperty: string, label: string, cellWidth: number, cellHeight: number, treeContainer: {selector: string, minWidth: number}}}
                 */
                $scope.defaultOptions = {
                    /**
                     * children property name for the treeData
                     */
                    itemsLabel: 'items',
                    /**
                     * default expand all nodes to a certain level
                     */
                    expandLevel: 0,
                    /**
                     * the property name used in expanding column
                     */
                    expandingProperty: 'name',
                    /**
                     * the property name for displaying the branch label
                     */
                    label: 'name',
                    /**
                     * default table cell width
                     */
                    cellWidth: 120,
                    /**
                     * default table cell height
                     */
                    cellHeight: 30,
                    /**
                     * the tree table container
                     */
                    treeContainer: 'body',
                    /**
                     * is the tree fit to container width
                     */
                    isFitTreeContainer: true
                };

                /**
                 * setting default options
                 */
                angular.forEach($scope.defaultOptions, function (val, key) {
                    if (typeof $scope.options[key] === 'undefined') {
                        $scope.options[key] = val;
                    }
                });

                /**
                 * ****************** icons ******************
                 */

                /**
                 * default icons
                 */
                $scope.defaultIcons = {
                    iconCollapse: 'fa fa-plus',
                    iconExpand: 'fa fa-minus'
                };

                /**
                 * setting default icons
                 */
                angular.forEach($scope.defaultIcons, function (val, key) {
                    if (typeof $scope.icons[key] === 'undefined') {
                        $scope.icons[key] = val;
                    }
                });

                /**
                 * ****************** columns definitions ******************
                 */
                angular.forEach($scope.colDefs, function (col) {
                    col.width = parseFloat(angular.isUndefined(col.minWidth) ? 50 : col.width);
                    col.minWidth = parseFloat(angular.isUndefined(col.minWidth) ? col.width : col.minWidth);
                    if (col.width <= 0) {
                        col.width = 50;
                        console.error('column has less than zero width, setting to 50px', col);
                    }
                    if (col.minWidth <= 0) {
                        col.minWidth = col.width;
                    }

                    if (col.width < col.minWidth) {
                        col.minWidth = col.width;
                    }
                });


                /**
                 * ****************** callbacks ******************
                 */

                /**
                 *
                 */
                $scope.callbacks = angular.isObject($scope.callbacks) ? $scope.callbacks : {};


                /**
                 * ****************** common scope variables ******************
                 */

                /**
                 *
                 * @type {{}}
                 */
                $scope.timers = {};
                $scope.UpdateCount = 0;
                $scope.previousUpdateCount = null;
                $scope.intervals = {};


                /**
                 * ****************** tree container width settings ******************
                 */

                $scope.scrollbarWidth = UtilService.getScrollBarWidth();
                $scope.previousContainerWidth = 0;
                $scope.isFullWidth = true;
                $scope.intervals.setCellWidth = $interval(function () {
                    $scope.containerWidth = angular.element($scope.treeContainer).width();
                    if (isFinite($scope.containerWidth) && $scope.previousContainerWidth !== $scope.containerWidth) {
                        UtilService.setCellWidth($scope);
                    }
                    $scope.previousContainerWidth = $scope.containerWidth;
                }, 500);

                /**
                 * ****************** tree init related functions ******************
                 */

                /**
                 * iterate each branch of the data tree
                 * @param callback
                 */
                $scope.forEachBranch = function (callback) {
                    (function walkTree(data, parent, level, visible) {
                        angular.forEach(data, function (branch) {
                            callback(branch, parent, level, visible);
                            if (!angular.isArray(data[$scope.options.itemsLabel])) {
                                data[$scope.options.itemsLabel] = [];
                            } else if (data[$scope.options.itemsLabel].length) {
                                angular.forEach(data[$scope.options.itemsLabel], function () {
                                    walkTree(data[$scope.options.itemsLabel], data, level + 1, (visible || !parent) && branch.expanded);
                                });
                            }
                        });
                    })($scope.treeData, null, 0, true);
                };


                /**
                 * set the branch
                 * @param branch
                 */
                $scope.initBranch = function (branch) {
                    if ($scope.callbacks.initBranch) {
                        $scope.callbacks.initBranch(branch);
                    }
                };


                $scope.init = function () {
                    $scope.treeRows = [];

                    $scope.forEachBranch(function (branch, parent, level, visible) {
                        branch.uid = UtilService.generateUUID();
                        branch.pid = parent ? parent.uid : '';

                        branch.level = level;

                        if (typeof branch.expanded === 'undefined') {
                            branch.expanded = branch.level < $scope.options.expandLevel;
                        }

                        if (!$scope.callbacks.treeFilter) {
                            branch.visible_ = true;
                            branch._visible_ = !parent ? true : visible;
                        }


                        $scope.initBranch(branch);

                        $scope.treeRows.push({
                            level: level,
                            branch: branch,
                            label: function () {
                                return this.branch[$scope.options.label];
                            },
                            treeIcon: function () {
                                return this.branch.expanded ? $scope.icons.iconCollapse : $scope.icons.iconExpand;
                            }
                        });
                    });

                    if ($scope.callbacks.treeFilter) {
                        $scope.callbacks.treeFilter($scope.treeData);
                    }
                };

                /**
                 * ****************** internal functions ******************
                 */


                $scope.toggleCheckboxes = function ($event) {
                    var action = $event.target.checked;
                    angular.forEach($scope.treeRows, function (row) {
                        if (row.branch.selected !== action) {
                            $scope.branchClicked({}, row.branch, {isMultiple: true});
                        }
                    });
                };

                $scope.scrollEnd = function () {
                    if ($scope.loadMore()) {
                        ($scope.loadMore())();
                    }
                };


                $scope.setSwitch = function (branch) {
                    if ($scope.rowSwitch()) {
                        ($scope.rowSwitch())(branch);
                    }
                };


                /** @expose */
                $scope.setRow = function (branch) {
                    if ($scope.rowInit()) {
                        ($scope.rowInit())(branch);
                    }
                };

                /** @expose */
                $scope.onColResizeStart = function ($event, col) {
                    $scope.resizingCol = col;
                    $scope.resizeStartX = $event.screenX;
                    angular.element(document).mousemove($scope.onMouseMove);
                    angular.element(document).mouseup($scope.onMouseUp);
                    return false;
                };

                /** @expose */
                $scope.onMouseMove = function ($event) {
                    if ($scope.resizingCol) {
                        var resizedWidth = ($event.screenX - $scope.resizeStartX);
                        $scope.resizeStartX = $event.screenX;
                        if (isPercentageWidth) {
                            UtilService.setPercentageWidth($scope, resizedWidth);
                        }
                        if (!$scope.$root.$$phase) {
                            $scope.$digest();
                        }
                    }
                    return false;
                };
                /** @expose */
                $scope.onMouseUp = function (event) {
                    $(document).off('mousemove', $scope.onMouseMove);
                    $(document).off('mouseup', $scope.onMouseUp);
                    if (resizingCol) {
                        var resizedWidth = (event['screenX'] - resizeStartX);
                        if (isPercentageWidth) {
                            setPercentageWidth(resizedWidth);
                        }
                    }
                    if (!$scope.$root.$$phase) {
                        $scope.$digest();
                    }
                    resizingCol = null;
                    return false;
                };

                /**
                 * ****************** external functions ******************
                 */
                var treeControl = $scope.treeControl = {};

                treeControl.isSelectedAll = function () {
                    for (var i = 0; i < $scope.treeRows.length; i++) {
                        if (!$scope.treeRows[i].branch.selected) {
                            return false;
                        }
                    }
                    return true;
                };

            }
        }
    }

})();


eConstruct.ecTreeTable.directive =
    function ($compile, $http, $interval, $rootScope, $timeout, $window, FolderService) {
        'use strict';

        return {
            'restrict': 'E',
            'replace': true,
            'scope': {
                /** @expose */
                'treeContainerId': '@',
                /** @expose */
                'treeData': '=',
                /** @expose */
                'treeFilter': '&',
                /** @expose */
                'loadMore': '&',
                /** @expose */
                isLoading: '=',
                /** @expose */
                'colDefs': '=',
                /** @expose */
                'expandOn': '=',
                /** @expose */
                'onSelect': '&',
                /** @expose */
                'treeControl': '=',
                /** @expose */
                'rowTemplateUrl': '@',
                /** @expose */
                'headerTemplateUrl': '@',
                /** @expose */
                'rowInit': '&',
                /** @expose */
                'rowSwitch': '&',
                /** @expose */
                'rowClass': '&',
                /** @expose */
                'callbacks': '=',
                /** @expose */
                'instances': '=',
                /** @expose */
                'multiSelect': '=',
                /** @expose */
                'allowMultiple': '=',
                /** @expose */
                'selectedBranches': '=',
                /** @expose */
                'beforeShiftKey': '&',
                /** @expose */
                'afterShiftKey': '&',
                /** @expose */
                'options': '=',
                /** @expose */
                'noDataLabel': '@',
                /** @expose */
                'searchNotFoundLabel': '@',
                /** @expose */
                'itemsLabel': '@'
            },
            'link': function (scope, element, attrs) {
                var resizingCol, resizeStartX, _colDefs, _firstRow, error, expandingProperty, expandLevel, forAllAncestors, forEachBranch, getParent, n, selectBranch, tree;

                /** @expose */
                $scope.isFullWidth = true;

                $scope.reduceColWidth = 0;

                $scope.options['resizePivotColIndex'] = $scope.options['resizePivotColIndex'] === undefined ? 0 : $scope.options['resizePivotColIndex'];


                var viewpointElement;
                var setViewport = function (scroll) {
                    if (scroll && !$scope.isListComplete && angular.element('#tree-grid-' + scope['$id'] + ' .table-grid-body .table-grid-viewpoint').height() <= (viewpointElement.scrollTop() + viewpointElement.height() + 30)) {
                        if ($scope.loadMore() && !$scope.loadMoreSign) {
                            ($scope.loadMore())(tree);
                        }
                    } else if (viewpointElement) {
                        viewportTop = parseInt(viewpointElement.scrollTop() / $scope.defaultCellHeight) - 10;
                        viewportTop = viewportTop < 0 ? 0 : viewportTop;
                        viewportBottom = parseInt((viewpointElement.scrollTop() + viewpointElement.height()) / $scope.defaultCellHeight) + 10;
                    }
                };

                var scrollbarWidth = getScrollBarWidth();
                var isPercentageWidth = $scope.options && $scope.options['layoutUnit'] && $scope.options['layoutUnit'] === '%';
                var intervalUpdate = null;
                if (isPercentageWidth) {
                    intervalUpdate = $interval(function () {
                        setPercentageWidth();
                    }, 500);
                }
                /** @expose */
                $scope.isSelectedAll = function () {
                    if (!$scope.multiSelect) {
                        return false;
                    }
                    var selected = 0;
                    _.each($scope.treeRows, function (row) {
                        if (row && row['branch']['selected']) {
                            selected++;
                        }
                    });
                    var total = $scope.treeRows ? $scope.treeRows.length : 0;
                    return selected === total;
                };
                /** @expose */
                $scope.toggleCheckboxes = function ($event) {
                    var action = $event['target']['checked'];
                    _.each($scope.treeRows, function (row) {
                        if (row['branch']['selected'] !== action) {
                            $scope.userClicksBranch({}, row['branch'], {'isMultiple': true});
                        }
                    });
                };

                /** misc **/
                /** @expose */
                $scope.scrollEnd = function () {
                    if ($scope.loadMore()) {
                        ($scope.loadMore())();
                    }
                };

                /** @expose */
                $scope.setSwitch = function (branch) {
                    if ($scope.rowSwitch()) {
                        ($scope.rowSwitch())(branch);
                    }
                };


                /** @expose */
                $scope.setRow = function (branch) {
                    if ($scope.rowInit()) {
                        ($scope.rowInit())(branch);
                    }
                };

                /** @expose */
                $scope.onColResizeStart = function ($event, col) {
                    resizingCol = col;
                    resizeStartX = $event['screenX'];
                    $(document).mousemove($scope.onMouseMove);
                    $(document).mouseup($scope.onMouseUp);
                    return false;
                };

                /** @expose */
                $scope.onMouseMove = function (event) {
                    if (resizingCol) {
                        var resizedWidth = (event['screenX'] - resizeStartX);
                        resizeStartX = event['screenX'];
                        if (isPercentageWidth) {
                            setPercentageWidth(resizedWidth);
                        }
                        if (!$scope.$root.$$phase) {
                            $scope.$digest();
                        }
                    }
                    return false;
                };
                /** @expose */
                $scope.onMouseUp = function (event) {
                    $(document).off('mousemove', $scope.onMouseMove);
                    $(document).off('mouseup', $scope.onMouseUp);
                    if (resizingCol) {
                        var resizedWidth = (event['screenX'] - resizeStartX);
                        if (isPercentageWidth) {
                            setPercentageWidth(resizedWidth);
                        }
                    }
                    if (!$scope.$root.$$phase) {
                        $scope.$digest();
                    }
                    resizingCol = null;
                    return false;
                };
                /** @expose */
                $scope.cellStyle = function (index, isLastCell, isHeaderCell) {
                    //reworked to save time to calculate cell style on 30/10/2015
                    if (index === 0) {
                        var left = 0;
                        for (var i = 0; i < $scope.colDefinitions.length; i++) {
                            var style = {};
                            style['width'] = $scope.colDefinitions[i]['width'] ? $scope.colDefinitions[i]['width'] + 'px' : (isPercentageWidth ? 0 : $scope.defaultCellWidth) + 'px';
                            style['cursor'] = resizingCol ? 'col-resize' : 'pointer';
                            style['text-align'] = $scope.colDefinitions[i]['align'] ? $scope.colDefinitions[i]['align'] : (isHeaderCell ? 'center' : 'left');

                            if (isLastCell) {
                                //style['border-right'] = 'none';
                            }
                            if (i > 0) {
                                left += parseFloat($scope.colDefinitions[i - 1]['width'] ? $scope.colDefinitions[i - 1]['width'] : (isPercentageWidth ? 0 : $scope.defaultCellWidth));
                            }
                            style['left'] = left + 'px';
                            $scope.colDefinitions[i]['cellStyle'] = style;
                        }
                    }

                    return $scope.colDefinitions[index]['cellStyle'];
                };
                /** @expose */
                $scope.cellStyleInner = function (index) {
                    var style = {};
                    style['width'] = $scope.colDefinitions[index]['width'] ? ($scope.colDefinitions[index]['width'] - 11) + 'px' : (isPercentageWidth ? 0 : $scope.defaultCellWidth - 11) + 'px';
                    style['cursor'] = resizingCol ? 'col-resize' : 'pointer';
                    style['display'] = 'block';
                    style['text-align'] = $scope.colDefinitions[index]['align'] ? $scope.colDefinitions[index]['align'] : 'left';

                    return style;
                };
                /** @expose */
                $scope.rowStyle = function (index) {
                    var style = {};
                    style['top'] = (index * $scope.defaultCellHeight) + 'px';
                    style['height'] = $scope.defaultCellHeight;
                    return style;
                };

                if ($scope.rowClass() === undefined) {
                    $scope.rowClass = function (odd, selected) {
                        return (odd ? 'table-grid-row-odd' : 'table-grid-row-even') + (selected ? ' active' : '');
                    };
                } else {
                    $scope.rowClass = $scope.rowClass();
                }

                /** @expose */
                $scope.levelStyle = function (level) {
                    var style = {};
                    style['left'] = ((level - 1) * 20) + 'px';
                    return style;
                };

                /** @expose */
                $scope.preventDefault = function ($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                };


                /** @expose */
                $scope.anyVisibleChildren = function (branch) {
                    if (!branch[itemsLabel] || !branch[itemsLabel].length) {
                        branch['anyChildren'] = true;
                        return false;
                    }
                    //1 level traverse only
                    var anyVisibleChildren = false;
                    _.any(branch[itemsLabel], function (item) {
                        if (item['visible_']) {
                            anyVisibleChildren = true;
                            return true;
                        }
                    });
                    branch['anyChildren'] = !anyVisibleChildren;
                    return anyVisibleChildren;
                };
                /** end misc **/


                if (!attrs['iconExpand']) {
                    attrs['iconExpand'] = 'fa fa-plus';
                }
                if (!attrs['iconCollapse']) {
                    attrs['iconCollapse'] = 'fa fa-minus';
                }
                if (!attrs['iconLeaf']) {
                    attrs['iconLeaf'] = 'fa fa-file';
                }
                if (!attrs['expandLevel']) {
                    attrs['expandLevel'] = '2';
                }

                expandLevel = parseInt(attrs['expandLevel'], 10);

                if (!$scope.rowTemplateUrl) {
                    alert('no row template defined for the tree!');
                    return;
                }

                /** @expose */
                $scope.expandingProperty = '';
                if (attrs.expandOn) {
                    expandingProperty = $scope.expandOn;
                    $scope.expandingProperty = $scope.expandOn;
                }
                else {
                    _firstRow = $scope.treeData[0];
                    var _keys = Object.keys(_firstRow);
                    for (var i = 0, len = _keys.length; i < len; i++) {
                        if (typeof(_firstRow[_keys[i]]) === 'string') {
                            expandingProperty = _keys[i];
                            break;
                        }
                    }
                    if (!expandingProperty) {
                        expandingProperty = _keys[0];
                    }
                    $scope.expandingProperty = expandingProperty;
                }

                /** @expose */
                $scope.colDefinitions = [];
                if (!attrs.colDefs) {
                    _colDefs = [];
                    _firstRow = $scope.treeData[0];
                    var _unwantedColumn = [itemsLabel, 'level', 'expanded', expandingProperty];
                    for (var idx in _firstRow) {
                        if (_unwantedColumn.indexOf(idx) === -1) {
                            _colDefs.push({field: idx});
                        }
                    }
                    $scope.colDefinitions = _colDefs;
                }
                else {
                    $scope.colDefinitions = $scope.colDefs;
                    _.each($scope.colDefs, function (col) {
                        //default col min width is 30
                        col['minWidth'] = col['minWidth'] === undefined ? (col['width'] < 30 ? col['width'] : 30) : col['minWidth'];
                    });
                }

                forEachBranch = function (f) {
                    var dof, rootBranch, _i, _len, _ref, _results;
                    dof = function (branch, level) {
                        var child, _i, _len, _ref, _results;
                        f(branch, level);
                        if (branch[itemsLabel] !== undefined) {
                            _ref = branch[itemsLabel];
                            _results = [];
                            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                                child = _ref[_i];
                                _results.push(dof(child, level + 1));
                            }
                            return _results;
                        }
                    };
                    _ref = $scope.treeData;
                    _results = [];
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        rootBranch = _ref[_i];
                        _results.push(dof(rootBranch, 1));
                    }
                    return _results;
                };
                /** @expose */
                $scope.selectedBranches = $scope.selectedBranches ? $scope.selectedBranches : {};

                selectBranch = function (branch, data) {
                    if (!branch || branch['disabled'] || $scope.options['disableSelection']) {
                        return;
                    }

                    if (!data) {
                        data = {'isMultiple': false};
                    }

                    //expandAllParents(branch);
                    if (data['isMultiple']) {
                        branch['selected'] = !branch['selected'];
                        if (!branch['selected']) {
                            $scope.selectedBranches[branch['uid']] = null;
                        } else {
                            $scope.selectedBranches[branch['uid']] = branch;
                        }
                    } else {
                        _.each($scope.selectedBranches, function (b) {
                            if (b) {
                                b['selected'] = false;
                            }
                        });
                        $scope.selectedBranches = {};
                        branch['selected'] = true;
                        $scope.selectedBranches[branch['uid']] = branch;
                    }

                    if (branch['onSelect'] !== undefined) {
                        return $timeout(function () {
                            return branch['onSelect'](branch, data);
                        });
                    } else if (!data['silentSelect']) {
                        if ($scope.onSelect() !== undefined) {
                            return $timeout(function () {
                                return ($scope.onSelect())(branch, data);
                            });
                        }
                    }
                };

                var keyCode = 0;
                var keyCodeUp = function () {
                    keyCode = 0;
                };
                var keyCodeDown = function (event) {
                    keyCode = event.keyCode;
                };
                $(window).bind('keyup', keyCodeUp);
                $(window).bind('keydown', keyCodeDown);

                /** @expose */
                $scope.userClicksBranch = function ($event, branch, data) {
                    $root$scope.$broadcast('tree.click.branch');
                    if (!branch) {
                        return;
                    }

                    if ($event.stopPropagation) {
                        $event.stopPropagation();
                    }

                    var isMultiple = $scope.multiSelect;

                    //Firefox: 224
                    //Opera: 17
                    //WebKit (Safari/Chrome): 91 (Left Apple) or 93 (Right Apple)
                    var userAgent = $window.navigator.userAgent.toLowerCase();
                    var isMac = $window.navigator && $window.navigator.platform.indexOf('Mac') >= 0;
                    var isFirefox = userAgent.indexOf('firefox') > -1;
                    var isOpera = userAgent.indexOf('opera') > -1;
                    var isWebKit = userAgent.indexOf('safari') > -1 || userAgent.indexOf('chrome') > -1;

                    if ($event['ctrlKey'] || (isMac && (keyCode === 224 && isFirefox) || (keyCode === 17 && isOpera) ||
                        ((keyCode === 91 || keyCode === 93) && isWebKit))) {
                        isMultiple = $scope.allowMultiple;
                    }
                    if ($event['shiftKey']) {
                        isMultiple = $scope.allowMultiple;
                    } else {
                        //record last selected item, use pageY to determine if up or down
                        branch['pageY'] = $event['pageY'];
                        $scope.lastClickedBranch = branch;
                    }

                    data = data ? data : {};
                    data['isMultiple'] = data['isMultiple'] !== undefined ? data['isMultiple'] : isMultiple;

                    if ($event['shiftKey']) {
                        var reset = function () {
                            _.each($scope.selectedBranches, function (b) {
                                if (b) {
                                    b['selected'] = false;
                                }
                            });
                            $scope.selectedBranches = {};
                            if ($scope.beforeShiftKey()) {
                                ($scope.beforeShiftKey())($event, branch, $scope.lastClickedBranch);
                            }
                        };

                        if (!$scope.lastClickedBranch) {
                            $scope.lastClickedBranch = tree.getFirstBranch();
                            $scope.lastClickedBranch['pageY'] = -1;
                        }
                        if ($scope.lastClickedBranch) {
                            var nextBranch = $event['pageY'] < $scope.lastClickedBranch['pageY'] ? tree.getPrevBranch : tree.getNextBranch;
                            var b = nextBranch($scope.lastClickedBranch);
                            if ($scope.lastClickedBranch['uid'] === branch['uid']) {
                                reset();
                                selectBranch(branch, data);
                            } else if (b) {
                                reset();
                                //select anchor
                                if (!$scope.lastClickedBranch['selected']) {
                                    selectBranch($scope.lastClickedBranch, data);
                                }
                                while (b && b['uid'] !== branch['uid']) {
                                    selectBranch(b, data);
                                    b = nextBranch(b);
                                }
                                //select target
                                if (!branch['selected']) {
                                    selectBranch(branch, data);
                                }
                            }
                            if ($scope.afterShiftKey()) {
                                ($scope.afterShiftKey())($event, branch, $scope.lastClickedBranch);
                            }
                        }
                    } else {
                        return selectBranch(branch, data);
                    }
                };
                getParent = function (child) {
                    var parent;
                    parent = void 0;
                    if (child['parentUid']) {
                        forEachBranch(function (b) {
                            if (b['uid'] === child['parentUid']) {
                                parent = b;
                                return parent;
                            }
                        });
                    }
                    return parent;
                };
                forAllAncestors = function (child, fn) {
                    var parent;
                    parent = getParent(child);
                    if (parent !== undefined) {
                        fn(parent);
                        return forAllAncestors(parent, fn);
                    }
                };

                /** @expose */
                $scope.treeRows = [];

                if (!$scope.treeData || !$scope.treeData.length) {
                    $scope.treeData = [];
                }

                n = $scope.treeData.length;
                if ($scope.treeControl === undefined || !angular.isObject($scope.treeControl)) {
                    $scope.treeControl = {};
                }

                tree = $scope.treeControl;


                var forEachChild = function (b, callback) {
                    _.each(b[itemsLabel], function (c) {
                        callback(c, b);
                        if (c[itemsLabel] && c[itemsLabel].length) {
                            forEachChild(c, callback);
                        }
                    });
                };

                /** @expose */
                tree.toggleExpansion = function (branch, flag) {
                    branch['expanded'] = flag === undefined ? !branch['expanded'] : flag;

                    forEachChild(branch, function (c, p) {
                        c['_visible_'] = p['_visible_'] && p['expanded'] && branch['expanded'] && !!c['visible_'];
                    });
                };
                /** @expose */
                $scope.toggleExpansion = tree.toggleExpansion;

                /** @expose */
                tree.loading = function () {
                    $scope.isLoading = true;
                };

                var loadingInterval = null;
                /** @expose */
                tree.inspectLoading = function () {
                    $scope.UpdateCount = 0;
                    $scope.previousUpdateCount = null;
                    $scope.isLoading = true;

                    loadingInterval = $interval(function () {
                        if ($scope.UpdateCount === $scope.previousUpdateCount) {
                            $scope.isLoading = false;
                            $scope.isEmpty = $scope.treeRows.length === 0;
                            $interval.cancel(loadingInterval);
                            //loadingInterval = null;
                            $timeout(function () {
                                $root$scope.$broadcast('tree.grid.load.complete', $scope.treeControl);
                                viewpointElement = angular.element('#tree-grid-' + scope['$id'] + ' .table-grid-body');
                                if ($scope.treeFilter()) {
                                    ($scope.treeFilter())($scope.treeData, expandLevel);
                                }
                            });
                        }

                        $scope.previousUpdateCount = $scope.UpdateCount;
                    }, 100);
                };

                /** @expose */
                tree.isAnyVisibleItmes = function () {
                    return $scope.treeRowsFiltered.length;
                };

                /** @expose */
                tree.applyFilter = function () {
                    if ($scope.treeFilter()) {
                        ($scope.treeFilter())($scope.treeData);
                    }
                };

                /** @expose */
                tree.sortBy = function (field, reverseOrder) {
                    if (_.isFunction(field)) {
                        (function (treeData) {
                            field(treeData);
                            tree.onTreeDataChange();
                        })($scope.treeData);
                    } else {
                        (function (treeData, field, reverseOrder) {
                            FolderService.sortTree(treeData, field, reverseOrder);
                            tree.onTreeDataChange();
                        })($scope.treeData, field, reverseOrder);
                    }
                };

                /** @expose */
                tree.expandAllParents = function (child) {
                    child['_visible_'] = true;
                    return forAllAncestors(child, function (b) {
                        b['expanded'] = b['_visible_'] = true;
                        _.each(b[itemsLabel], function (i) {
                            i['_visible_'] = true;
                        });
                        return b['expanded'];
                    });
                };

                /** @expose */
                tree.expandAll = function () {
                    return forEachBranch(function (b) {
                        //extra param: level
                        b['expanded'] = b['_visible_'] = true;
                        return b['expanded'];
                    });
                };
                /** @expose */
                tree.collapseAll = function () {
                    return forEachBranch(function (b) {
                        //extra param: level
                        b['expanded'] = b['_visible_'] = false;
                        return b['expanded'];
                    });
                };
                /** @expose */
                tree.getFirstBranch = function () {
                    n = $scope.treeData.length;
                    if (n > 0) {
                        return $scope.treeData[0];
                    }
                };
                /** @expose */
                tree.selectFirstBranch = function () {
                    var b;
                    b = tree.getFirstBranch();
                    return tree.selectBranch(b);
                };
                /** @expose */
                tree.getSelectedBranch = function () {
                    return $scope.selectedBranches;
                };
                /** @expose */
                tree.getParentBranch = function (b) {
                    return getParent(b);
                };
                /** @expose */
                tree.clicksBranch = function ($event, branch, data) {
                    $scope.userClicksBranch($event, branch, data);
                };
                /** @expose */
                tree.selectBranch = function (b, data) {
                    selectBranch(b, data);
                    return b;
                };
                /** @expose */
                tree.getItems = function (b) {
                    return b[itemsLabel];
                };
                /** @expose */
                tree.selectParentBranch = function (b) {
                    var p;
                    if (b === undefined) {
                        return;
                    }
                    if (b !== undefined) {
                        p = tree.getParentBranch(b);
                        if (p !== undefined) {
                            tree.selectBranch(p);
                            return p;
                        }
                    }
                };
                /** @expose **/
                tree.getNodeExternal = function (match) {
                    var foundNode;
                    var findNode = function (nodes) {
                        _.any(nodes, function (node) {
                            if (foundNode) {
                                return true;
                            }

                            if (match(node)) {
                                foundNode = node;
                            } else if (node[itemsLabel] && node[itemsLabel].length) {
                                findNode(node[itemsLabel]);
                            }
                        });
                    };

                    findNode($scope.treeData);
                    return foundNode;
                };


                //keep track of adding / updating / deleting branch
                var updateBufferTimer = null;
                var trackUpdate = function () {
                    if (!updateBufferTimer) {
                        updateBufferTimer = $timeout(function () {
                            tree.onTreeDataChange();
                            updateBufferTimer = null;
                        }, 200);
                    }
                };

                /** @expose
                 * @param {Object} newBranch
                 * @param {string=} sortKey
                 * @param {boolean=} reverseOrder
                 **/
                tree.addBranchExternal = function (newBranch, sortKey, reverseOrder) {
                    var folderIndex = 0;
                    var foundNode = null;

                    var findParentNode = function (nodes, i) {
                        _.any(nodes, function (node) {
                            if (node['isFolder'] && (folderArr[i] === node['name'] || folderArr[i] === node['text'])) {
                                foundNode = node;
                                folderIndex++;
                                if (folderArr[folderIndex] === undefined) {
                                    return true;
                                } else if (node[itemsLabel] && node[itemsLabel].length) {
                                    findParentNode(node[itemsLabel], folderIndex);
                                }
                            }
                        });
                    };

                    var folderArr = FolderService.formFolderArray(newBranch['folder'] || (newBranch['model'] && newBranch['model']['folder'] ? newBranch['model']['folder'] : ''));
                    var newNode = newBranch['model'] ? newBranch : {
                        'text': newBranch['name'] || newBranch['text'],
                        'isFolder': false,
                        'expanded': true,
                        'model': newBranch
                    };

                    if (!folderArr || !folderArr.length) {
                        $scope.treeData.push(newNode);
                        FolderService.sortList($scope.treeData, sortKey, reverseOrder);
                    } else {
                        findParentNode($scope.treeData, folderIndex);
                        if (foundNode) {
                            tree.expandAllParents(foundNode);
                            var n = foundNode;
                            while (folderIndex < folderArr.length) {
                                var folderObject = {
                                    'text': folderArr[folderIndex],
                                    'isFolder': true,
                                    'expanded': true,
                                    'model': {}
                                };
                                folderObject[itemsLabel] = [];
                                n[itemsLabel].push(folderObject);
                                n = folderObject;
                                folderIndex++;
                            }
                            n[itemsLabel].push(newNode);
                            FolderService.sortList(foundNode[itemsLabel], sortKey, reverseOrder);
                        } else {
                            //no parent found, form new branch
                            var newList = FolderService.buildTreeFromList([newNode]);
                            $scope.treeData.push(newList[0]);
                            FolderService.sortList($scope.treeData, sortKey, reverseOrder);
                        }
                    }


                    trackUpdate();
                };
                /** @expose
                 * @param {Object} branch
                 * @param {Object} newModel
                 * @param {string=} sortKey
                 * @param {boolean=} reverseOrder
                 **/
                tree.addSubBranchExternal = function (branch, newModel, sortKey, reverseOrder) {
                    var newNode = newModel['model'] ? newModel : {
                        'text': newModel['name'] || newModel['text'],
                        'isFolder': false,
                        'expanded': true,
                        'model': newModel,
                        'selected': branch['selected'],
                        'visible_': true
                    };
                    tree.expandAllParents(branch);
                    if (!branch[itemsLabel]) {
                        branch[itemsLabel] = [];
                    }
                    branch[itemsLabel].push(newNode);
                    FolderService.sortList(branch[itemsLabel], sortKey, reverseOrder);

                    trackUpdate();
                };
                /** @expose **/
                tree.deleteBranchExternal = function (match) {
                    var foundNode = null;

                    var findNode = function (nodes) {
                        _.any(nodes, function (node) {
                            if (foundNode) {
                                return true;
                            }

                            if (!node['isFolder'] && match(node)) {
                                foundNode = node;
                            } else if (node[itemsLabel] && node[itemsLabel].length) {
                                findNode(node[itemsLabel]);
                            }
                        });
                    };
                    findNode($scope.treeData);

                    if (foundNode) {
                        tree.deleteBranch(foundNode);
                        //also delete the selected nodes instance
                        _.remove($scope.selectedBranches, function (branch) {
                            return branch === foundNode;
                        });

                        trackUpdate();
                        return foundNode;
                    }
                };
                /** @expose **/
                tree.updateBranchExternal = function (match, update) {
                    var foundNode = null;

                    var findNode = function (nodes) {
                        _.any(nodes, function (node) {
                            if (foundNode) {
                                return true;
                            }

                            if (!node['isFolder'] && match(node)) {
                                foundNode = node;
                            } else if (node[itemsLabel] && node[itemsLabel].length) {
                                findNode(node[itemsLabel]);
                            }
                        });
                    };

                    findNode($scope.treeData);

                    if (foundNode) {
                        update(foundNode, function (sort) {
                            var p = tree.getParentBranch(foundNode) || $scope.treeData;
                            while (p !== undefined) {
                                if (!_.isFunction(sort)) {
                                    FolderService.sortList(p[itemsLabel] || p, sort);
                                } else {
                                    sort(p[itemsLabel] || p);
                                }
                                p = tree.getParentBranch(p);
                            }
                        });

                        trackUpdate();
                    }
                };
                /** @expose */
                tree.addBranchWithParent = function (parent, newBranch) {
                    if (parent !== undefined) {
                        parent[itemsLabel].push(newBranch);
                        parent['expanded'] = true;
                        trackUpdate();
                    } else {
                        $scope.treeData.push(newBranch);
                    }
                    return newBranch;
                };
                /** @expose */
                tree.addRootBranch = function (newBranch) {
                    tree.addBranchWithParent(null, newBranch);
                    return newBranch;
                };
                /**
                 tree.expandBranch = function (b) {
                    if (b === undefined) {
                        return;
                    }
                    b['expanded'] = true;
                    return b;
                };

                 tree.collapseBranch = function (b) {
                    if (b === undefined) {
                        return;
                    }
                    b['expanded'] = false;
                    return b;
                };
                 */
                /** @expose */
                tree.getSiblings = function (b) {
                    var p, siblings;
                    if (b === undefined) {
                        return;
                    }
                    p = tree.getParentBranch(b);
                    if (p) {
                        siblings = p[itemsLabel];
                    } else {
                        siblings = $scope.treeData;
                    }
                    return siblings;
                };
                /** @expose */
                tree.getNextSibling = function (b) {
                    var i, siblings;
                    if (b === undefined) {
                        return;
                    }
                    siblings = tree.getSiblings(b);
                    n = siblings.length;
                    i = siblings.indexOf(b);
                    if (i < n) {
                        return siblings[i + 1];
                    }
                };
                /** @expose */
                tree.getPrevSibling = function (b) {
                    var i, siblings;
                    if (b === undefined) {
                        return;
                    }
                    siblings = tree.getSiblings(b);
                    n = siblings.length;
                    i = siblings.indexOf(b);
                    if (i > 0) {
                        return siblings[i - 1];
                    }
                };
                /** @expose */
                tree.selectNextSibling = function (b) {
                    var next;
                    if (b === undefined) {
                        return;
                    }
                    next = tree.getNextSibling(b);
                    if (next !== undefined) {
                        return tree.selectBranch(next);
                    }
                };
                /** @expose */
                tree.selectPrevSibling = function (b) {
                    var prev;
                    if (b === undefined) {
                        return;
                    }
                    prev = tree.getPrevSibling(b);
                    if (prev !== undefined) {
                        return tree.selectBranch(prev);
                    }
                };
                /** @expose */
                tree.getFirstChild = function (b) {
                    var _ref;
                    if (b === undefined) {
                        return;
                    }
                    if (((_ref = b[itemsLabel]) !== undefined ? _ref.length : void 0) > 0) {
                        return b[itemsLabel][0];
                    }
                };
                /** @expose */
                tree.getClosestAncestorNextSibling = function (b) {
                    var next, parent;
                    next = tree.getNextSibling(b);
                    if (next !== undefined) {
                        return next;
                    } else {
                        parent = tree.getParentBranch(b);
                        return tree.getClosestAncestorNextSibling(parent);
                    }
                };
                /** @expose */
                tree.getNextBranch = function (b) {
                    var next;
                    if (b === undefined) {
                        return;
                    }
                    next = tree.getFirstChild(b);
                    if (next !== undefined) {
                        return next;
                    } else {
                        next = tree.getClosestAncestorNextSibling(b);
                        return next;
                    }
                };
                /** @expose */
                tree.selectNextBranch = function (b) {
                    var next;
                    if (b === undefined) {
                        return;
                    }
                    next = tree.getNextBranch(b);
                    if (next !== undefined) {
                        tree.selectBranch(next);
                        return next;
                    }
                };
                /** @expose */
                tree.lastDescendant = function (b) {
                    var lastChild;
                    if (b === undefined) {
                        //debugger;
                    }
                    n = b[itemsLabel].length;
                    if (n === 0) {
                        return b;
                    } else {
                        lastChild = b[itemsLabel][n - 1];
                        return tree.lastDescendant(lastChild);
                    }
                };
                /** @expose */
                tree.getPrevBranch = function (b) {
                    var parent, prevSibling;
                    if (b === undefined) {
                        return;
                    }
                    prevSibling = tree.getPrevSibling(b);
                    if (prevSibling !== undefined) {
                        return tree.lastDescendant(prevSibling);
                    } else {
                        parent = tree.getParentBranch(b);
                        return parent;
                    }
                };
                /** @expose */
                tree.selectPrevBranch = function (b) {
                    var prev;
                    if (b === undefined) {
                        return;
                    }
                    prev = tree.getPrevBranch(b);
                    if (prev !== undefined) {
                        tree.selectBranch(prev);
                        return prev;
                    }
                };
                /** @expose */
                tree.deleteBranch = function (b) {
                    if (b === undefined) {
                        return;
                    }
                    var p = tree.getParentBranch(b);
                    if (p !== undefined) {
                        _.remove(p[itemsLabel], function (item) {
                            return item['uid'] === b['uid'];
                        });
                        if (p['isFolder'] && !p[itemsLabel].length) {
                            tree.deleteBranch(p);
                            trackUpdate();
                        }
                    } else {
                        $scope.treeData = _.remove($scope.treeData, function (item) {
                            return item['uid'] !== b['uid'];
                        });
                    }
                };


                tree.getData = function () {
                    return $scope.treeData;
                };
                tree.setData = function (data) {
                    $scope.treeData = data;
                };


                /** @expose */
                $scope.loadMoreSign = false;
                /** @expose */
                tree.toggleLoadMoreSign = function (flag) {
                    $scope.loadMoreSign = flag;
                };
                /** @expose */
                tree.getLoadMoreSign = function () {
                    return $scope.loadMoreSign;
                };

                /** @expose */
                $scope.isListComplete = false;
                /** @expose */
                tree.markListComplete = function (flag) {
                    $scope.isListComplete = flag;
                };
                /** @expose */
                tree.getListComplete = function () {
                    return $scope.isListComplete;
                };

                /** @expose */
                $scope.isEmpty = false;
                /** @expose */
                $scope.tableStyle = function () {
                    var style = {};
                    if ($scope.isFullWidth) {
                        style['overflow-x'] = 'hidden';
                    }
                    if ($scope.options['excludeBorder']) {
                        style['border'] = 'none';
                    }
                    return style;
                };

                /** @expose */
                $scope.filter = function (data) {
                    setViewport();
                    return _.filter(data, function (d) {
                        return d['branch']['_visible_'] || ($scope.options['visibleOnly'] && $scope.options['visibleOnly'](d));
                    });
                };


                var viewportTop = 0;
                var viewportBottom = 0;
                /** @expose */
                $scope.isInViewport = function (index) {
                    return index >= viewportTop && index <= viewportBottom;
                };
                /** @expose */
                $scope.treeRowsFiltered = [];
                /** @expose */
                $scope.getCanvasHeight = function () {
                    return {'height': $scope.treeRowsFiltered.length * $scope.defaultCellHeight, 'width': '100%'};
                };

                //| filter: {branch: {_visible_ : true}}
                var compileTemplate = function (rowTemplate, headerTemplate) {
                    var headerCheckbox = '<span ng-show="multiSelect" ng-if="expandingProperty === col.field">' +
                        '<input type="checkbox" ng-checked="isSelectedAll()" ' +
                        'ng-click="toggleCheckboxes($event);" style="float:left; margin-left: 22px; margin-top: 3px;" ' +
                        'class="ec-hidden-checkbox"/>' +
                        '</span>';

                    var content = '<div ng-show="treeRowsFiltered.length > 0 && !isLoading" ng-style="options.excludeHeader ? {\'padding-bottom\': \'0\'} : {}" class="tree-grid-wrapper tree-grid" id="tree-grid-' + scope['$id'] + '">' +
                        '<div ng-if="!options.excludeHeader" class="table-grid-header table-grid-height" ' + ($scope.options['excludeBorder'] ? 'style="border:none; background-color: transparent"' : '') + '>' +
                        '<div class="table-grid-header-rows table-grid-height">' +
                        '<div class="table-grid-header-row table-grid-height">' +
                        ( headerTemplate ? headerTemplate :
                        '<div ng-style="cellStyle($index, $last, true)" class="table-grid-cell table-grid-height" ' +
                        'ng-repeat="col in colDefinitions">' + headerCheckbox + ' <span>{{col.displayName | translate}}</span>' +
                        '<div ng-show="options.colResize" class="resize" ng-mousedown="onColResizeStart($event, col)"></div>' +
                        '</div>' ) +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '<div class="table-grid-body" ng-style="tableStyle()">' +
                        '<div class="table-grid-body-content">' +
                        '<div ng-style="getCanvasHeight()" class="table-grid-viewpoint">' +
                        '<div ng-repeat="row in (treeRowsFiltered = filter(treeRows)) track by row.branch.uid" ng-if="isInViewport($index)" ng-style="rowStyle($index)" ng-class="rowClass($odd, row.branch.selected)" ' +
                        'class="table-grid-body-row table-grid-height" ng-style="{\'width\' : (col.width ?  col.width : defaultCellWidth)}" ' +
                        'ng-click="userClicksBranch($event, row.branch)" ng-init="setRow(row.branch)"  ng-switch="setSwitch(row.branch)">' +
                        rowTemplate +
                        '</div>' +
                        '<div ng-if="loadMoreSign" ng-style="rowStyle(treeRowsFiltered.length)" style="width: 100%; text-align: center" class="table-grid-body-row table-grid-height"><img src="images/preloader.gif" height="30"></div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '<div ng-show="!treeRowsFiltered.length && !treeData.length && !isLoading" class="full-size"><div class="ec-no-records">{{ noDataLabel | translate }}</div></div>' +
                        '<div ng-show="!treeRowsFiltered.length && treeData.length && !isLoading" class="full-size"><div class="ec-no-records">{{ (searchNotFoundLabel || noDataLabel) | translate }}</div></div>' +
                        '<div ng-show="isLoading" class="full-size"><div class="ec-no-records"><img src="images/preloader.gif" width="32" height="32"></div></div>';

                    var contentElement = angular.element(content);
                    element.html(contentElement);
                    $compile(contentElement)(scope);


                    $scope.$watch('treeRowsFiltered.length', function () {
                        $timeout(function () {
                            angular.element('#tree-grid-' + scope['$id'] + ' .table-grid-body').off('scroll');
                            angular.element('#tree-grid-' + scope['$id'] + ' .table-grid-body').on('scroll', function () {
                                var headerRow = $('#tree-grid-' + scope['$id'] + ' .table-grid-header-row');
                                headerRow.css('left', -$(this).scrollLeft());
                                //headerRow.scrollLeft($(this).scrollLeft());
                                setViewport(true);
                            });
                        });
                    });

                    //select the tree nodes first if not empty
                    _.each($scope.selectedBranches, function (branch) {
                        if (branch && !branch['selected']) {
                            selectBranch(branch, {'isMultiple': true});
                        }
                    });

                    $scope.$watchCollection('treeData', $scope.treeControl['onTreeDataChange']);

                    $timeout(function () {
                        $root$scope.$broadcast('tree.grid.created', $scope.treeControl);
                        viewpointElement = angular.element('#tree-grid-' + scope['$id'] + ' .table-grid-body');
                    });
                };

                $scope.$on('$destroy', function () {
                    //if (intervalUpdate !== null) {
                    $interval.cancel(intervalUpdate);
                    //}

                    //if (loadingInterval) {
                    $interval.cancel(loadingInterval);
                    //}

                    //if (updateBufferTimer) {
                    $timeout.cancel(updateBufferTimer);
                    //}

                    $(window).unbind('keyup', keyCodeUp);
                    $(window).unbind('keydown', keyCodeDown);
                    angular.element('#tree-grid-' + scope['$id'] + ' .table-grid-body').off('scroll');

                    _.each($scope.timers, function (timer) {
                        $timeout.cancel(timer);
                    });
                });

                if ($scope.headerTemplateUrl) {
                    $http.get($scope.rowTemplateUrl)
                        .success(function (rowTemplate) {
                            $http.get($scope.headerTemplateUrl)
                                .success(function (headerTemplate) {
                                    compileTemplate(rowTemplate, headerTemplate);
                                });
                        });
                } else {
                    $http.get($scope.rowTemplateUrl)
                        .success(function (rowTemplate) {
                            compileTemplate(rowTemplate);
                        });
                }
            }
        };
    };


/**
 * @expose
 * @type {Array.<string>}
 */
eConstruct.ecTreeTable.directive.$inject = ['$compile', '$http', '$interval', '$rootScope', '$timeout', '$window', 'FolderService'];
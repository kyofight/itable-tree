'use strict';

(function () {
    angular.module('iTableTree').directive('iTableTree',
        ['$compile', '$http', '$interval', '$rootScope', '$timeout', '$window', 'TreeGeneralService', 'TreeControlService', 'UtilService', iTableTree]);

    function iTableTree($compile, $http, $interval, $rootScope, $timeout, $window, TreeGeneralService, TreeControlService, UtilService) {

        return {
            restrict: 'E',
            replace: true,
            scope: {
                multiSelect: '=',
                treeData: '=',
                colDefs: '=',
                callbacks: '=',
                options: '=',
                icons: '=',
                treeControlService: '='
            },
            link: function ($scope, element, attrs) {
                /**
                 *
                 */
                $scope.TreeGeneralService = new TreeGeneralService($scope);

                /**
                 *
                 */
                $scope.TreeControlService = new TreeControlService($scope);

                /**
                 *
                 * @type {Array}
                 */
                $scope.treeBranches = [];

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
                     *
                     */
                    templates: {
                        rowTemplateUrl: '',
                        rowTemplate: ''
                    },
                    /**
                     * icon font awesome
                     */
                    icons: {
                        iconExpand: 'fa fa-plus',
                        iconCollapse: 'fa fa-minus',
                        iconLeaf: 'fa fa-file'
                    },
                    /**
                     * children property name for the treeData
                     */
                    itemsLabel: 'items',
                    /**
                     * default expand all nodes to a certain level
                     */
                    expandLevel: 2,
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
                 * Default callbacks
                 */
                $scope.defaultCallbacks = {
                    treeSort: function (item1, item2) {
                        return UtilService.naturalSort(item1.label(), item2.label());
                    }
                };


                angular.forEach($scope.defaultCallbacks, function (val, key) {
                    if (typeof $scope.callbacks[key] === 'undefined') {
                        $scope.callbacks[key] = val;
                    }
                });


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
                $scope.viewportTop = 0;
                $scope.viewportBottom = 0;

                /**
                 * ****************** watch tree changes ******************
                 */

                $scope.$watch('treeData', function () {
                    $scope.treeBranches = [];
                    //setViewport();
                    angular.forEach($scope.treeData, function (branch) {
                        if (branch._visible_) {
                            $scope.treeBranches.push(branch);
                        }
                    });
                });

                /**
                 * ****************** tree container width settings ******************
                 */

                $scope.scrollbarWidth = UtilService.getScrollBarWidth();
                $scope.previousContainerWidth = 0;
                $scope.isFullWidth = true;
                $scope.treeBody = angular.element('#itree-' + $scope.$id + ' .itable-body');
                $scope.intervals.setCellWidth = $interval(function () {
                    $scope.treeWidth = $scope.treeBody.width();
                    if (isFinite($scope.treeWidth) && $scope.previousContainerWidth !== $scope.treeWidth) {
                        $scope.TreeGeneralService.setCellWidth();
                    }
                    $scope.previousContainerWidth = $scope.treeWidth;
                }, 500);

                /**
                 *
                 */

                $scope.keyCode = 0;
                $scope.keyCodeUp = function () {
                    $scope.keyCode = 0;
                };
                $scope.keyCodeDown = function (event) {
                    $scope.keyCode = event.keyCode;
                };
                $(window).bind('keyup', $scope.keyCodeUp);
                $(window).bind('keydown', $scope.keyCodeDown);


                /**
                 *
                 * TODO: stop here, meeting time
                 */

                var compileTemplate = function (rowTemplate, headerTemplate) {
                    var headerCheckbox = '<span ng-show="multiSelect" ng-if="expandingProperty === col.field">' +
                        '<input type="checkbox" ng-checked="isSelectedAll()" ' +
                        'ng-click="toggleCheckboxes($event);" style="float:left; margin-left: 22px; margin-top: 3px;" ' +
                        'class="ec-hidden-checkbox"/>' +
                        '</span>';

                    var content = '<div ng-show="treeRowsFiltered.length > 0 && !isLoading" ng-style="options.excludeHeader ? {\'padding-bottom\': \'0\'} : {}" class="tree-grid-wrapper tree-grid" id="tree-grid-' + scope['$id'] + '">' +
                        '<div ng-if="!options.excludeHeader" class="table-grid-header table-grid-height" ' + (scope.options['excludeBorder'] ? 'style="border:none; background-color: transparent"' : '') + '>' +
                        '<div class="table-grid-header-rows table-grid-height">' +
                        '<div class="table-grid-header-row table-grid-height">' +
                        ( headerTemplate ? headerTemplate :
                        '<div ng-style="cellStyle($index, $last, true)" class="table-grid-cell table-grid-height" ' +
                        'ng-repeat="col in colDefinitions">' + headerCheckbox + ' <span>{{col.displayName | translate}}</span>' +
                        '<div ng-show="options.colResize" class="resize" ng-mousedown="onColResizeStart($event, $index)"></div>' +
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


                    scope.$watch('treeRowsFiltered.length', function () {
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
                    _.each(scope.selectedBranches, function (branch) {
                        if (branch && !branch['selected']) {
                            selectBranch(branch, {'isMultiple': true});
                        }
                    });

                    scope.$watchCollection('treeData', scope.treeControl['onTreeDataChange']);

                    $timeout(function () {
                        $rootScope.$broadcast('tree.grid.created', scope.treeControl);
                        viewpointElement = angular.element('#tree-grid-' + scope['$id'] + ' .table-grid-body');
                    });
                };

                scope.$on('$destroy', function () {
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

                    _.each(scope.timers, function (timer) {
                        $timeout.cancel(timer);
                    });
                });

                if (scope.headerTemplateUrl) {
                    $http.get(scope.rowTemplateUrl)
                        .success(function (rowTemplate) {
                            $http.get(scope.headerTemplateUrl)
                                .success(function (headerTemplate) {
                                    compileTemplate(rowTemplate, headerTemplate);
                                });
                        });
                } else {
                    $http.get(scope.rowTemplateUrl)
                        .success(function (rowTemplate) {
                            compileTemplate(rowTemplate);
                        });
                }

            }
        }
    }

})();
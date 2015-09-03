/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Controller for Clusters screen.
controlCenterModule.controller('clustersController', ['$scope', '$controller', '$http', '$timeout', '$common', '$focus', '$confirm', '$copy', '$table', '$preview',
    function ($scope, $controller, $http, $timeout, $common, $focus, $confirm, $copy, $table, $preview) {
        // Initialize the super class and extend it.
        angular.extend(this, $controller('save-remove', {$scope: $scope}));

        $scope.joinTip = $common.joinTip;
        $scope.getModel = $common.getModel;
        $scope.compactJavaName = $common.compactJavaName;
        $scope.saveBtnTipText = $common.saveBtnTipText;

        $scope.tableReset = $table.tableReset;
        $scope.tableNewItem = $table.tableNewItem;
        $scope.tableNewItemActive = $table.tableNewItemActive;
        $scope.tableEditing = $table.tableEditing;
        $scope.tableStartEdit = $table.tableStartEdit;
        $scope.tableRemove = function (item, field, index) {
            $table.tableRemove(item, field, index);

            $common.markChanged($scope.ui.inputForm, 'clusterBackupItemChanged');
        };

        $scope.tableSimpleSave = $table.tableSimpleSave;
        $scope.tableSimpleSaveVisible = $table.tableSimpleSaveVisible;
        $scope.tableSimpleUp = $table.tableSimpleUp;
        $scope.tableSimpleDown = $table.tableSimpleDown;
        $scope.tableSimpleDownVisible = $table.tableSimpleDownVisible;

        $scope.previewInit = $preview.previewInit;
        $scope.previewChanged = $preview.previewChanged;

        $scope.formChanged = $common.formChanged;

        $scope.hidePopover = $common.hidePopover;

        var showPopoverMessage = $common.showPopoverMessage;

        $scope.discoveries = [
            {value: 'Vm', label: 'static IPs'},
            {value: 'Multicast', label: 'multicast'},
            {value: 'S3', label: 'AWS S3'},
            {value: 'Cloud', label: 'apache jclouds'},
            {value: 'GoogleStorage', label: 'google cloud storage'},
            {value: 'Jdbc', label: 'JDBC'},
            {value: 'SharedFs', label: 'shared filesystem'}
        ];

        $scope.swapSpaceSpis = [
            {value: 'FileSwapSpaceSpi', label: 'File-based swap'},
            {value: undefined, label: 'Not set'}
        ];

        $scope.events = [];

        for (var eventGroupName in $dataStructures.EVENT_GROUPS) {
            if ($dataStructures.EVENT_GROUPS.hasOwnProperty(eventGroupName)) {
                $scope.events.push({value: eventGroupName, label: eventGroupName});
            }
        }

        $scope.preview = {
            general: {xml: '', java: '', allDefaults: true},
            atomics: {xml: '', java: '', allDefaults: true},
            communication: {xml: '', java: '', allDefaults: true},
            deployment: {xml: '', java: '', allDefaults: true},
            events: {xml: '', java: '', allDefaults: true},
            marshaller: {xml: '', java: '', allDefaults: true},
            metrics: {xml: '', java: '', allDefaults: true},
            p2p: {xml: '', java: '', allDefaults: true},
            swap: {xml: '', java: '', allDefaults: true},
            time: {xml: '', java: '', allDefaults: true},
            pools: {xml: '', java: '', allDefaults: true},
            transactions: {xml: '', java: '', allDefaults: true}
        };

        $scope.cacheModes = $common.mkOptions(['LOCAL', 'REPLICATED', 'PARTITIONED']);

        $scope.deploymentModes = $common.mkOptions(['PRIVATE', 'ISOLATED', 'SHARED', 'CONTINUOUS']);

        $scope.transactionConcurrency = $common.mkOptions(['OPTIMISTIC', 'PESSIMISTIC']);

        $scope.transactionIsolation = $common.mkOptions(['READ_COMMITTED', 'REPEATABLE_READ', 'SERIALIZABLE']);

        $scope.segmentationPolicy = $common.mkOptions(['RESTART_JVM', 'STOP', 'NOOP']);

        $scope.marshallers = $common.mkOptions(['OptimizedMarshaller', 'JdkMarshaller']);

        $scope.ui = {expanded: false};

        $scope.toggleExpanded = function () {
            $scope.ui.expanded = !$scope.ui.expanded;

            $common.hidePopover();
        };

        $scope.panels = {activePanels: [0]};

        var simpleTables = {
            addresses: {msg: 'Such IP address already exists!', id: 'IpAddress'},
            regions: {msg: 'Such region already exists!', id: 'Region'},
            zones: {msg: 'Such zone already exists!', id: 'Zone'},
            peerClassLoadingLocalClassPathExclude: {msg: 'Such package already exists!', id: 'PeerClsPathExclude'}
        };

        $scope.tableSimpleValid = function (item, field, val, index) {
            var model = $common.getModel(item, field)[field.model];

            if ($common.isDefined(model)) {
                var idx = _.indexOf(model, val);

                // Found duplicate.
                if (idx >= 0 && idx != index) {
                    var simpleTable = simpleTables[field.model];

                    if (simpleTable) {
                        $common.showError(simpleTable.msg);

                        return $table.tableFocusInvalidField(index, simpleTable.id);
                    }
                }
            }

            return true;
        };

        $scope.clusters = [];

        $http.get('/models/clusters.json')
            .success(function (data) {
                $scope.screenTip = data.screenTip;
                $scope.general = data.general;
                $scope.advanced = data.advanced;
            })
            .error(function (errMsg) {
                $common.showError(errMsg);
            });

        // Fill cluster previews.
        function generatePreview(val) {
            if ($common.isDefined(val)) {
                var clusterCaches = _.reduce($scope.caches, function(caches, cache){
                    if (_.contains(val.caches, cache.value)) {
                        caches.push(cache.cache);
                    }

                    return caches;
                }, []);

                $scope.preview.general.xml = $generatorXml.clusterCaches(clusterCaches, $generatorXml.clusterGeneral(val)).join('');
                $scope.preview.general.java = $generatorJava.clusterCaches(clusterCaches, $generatorJava.clusterGeneral(val)).join('');
                $scope.preview.general.allDefaults = $common.isEmptyString($scope.preview.general.xml);

                $scope.preview.atomics.xml = $generatorXml.clusterAtomics(val).join('');
                $scope.preview.atomics.java = $generatorJava.clusterAtomics(val).join('');
                $scope.preview.atomics.allDefaults = $common.isEmptyString($scope.preview.atomics.xml);

                $scope.preview.communication.xml = $generatorXml.clusterCommunication(val).join('');
                $scope.preview.communication.java = $generatorJava.clusterCommunication(val).join('');
                $scope.preview.communication.allDefaults = $common.isEmptyString($scope.preview.communication.xml);

                $scope.preview.deployment.xml = $generatorXml.clusterDeployment(val).join('');
                $scope.preview.deployment.java = $generatorJava.clusterDeployment(val).join('');
                $scope.preview.deployment.allDefaults = $common.isEmptyString($scope.preview.deployment.xml);

                $scope.preview.events.xml = $generatorXml.clusterEvents(val).join('');
                $scope.preview.events.java = $generatorJava.clusterEvents(val).join('');
                $scope.preview.events.allDefaults = $common.isEmptyString($scope.preview.events.xml);

                $scope.preview.marshaller.xml = $generatorXml.clusterMarshaller(val).join('');
                $scope.preview.marshaller.java = $generatorJava.clusterMarshaller(val).join('');
                $scope.preview.marshaller.allDefaults = $common.isEmptyString($scope.preview.marshaller.xml);

                $scope.preview.metrics.xml = $generatorXml.clusterMetrics(val).join('');
                $scope.preview.metrics.java = $generatorJava.clusterMetrics(val).join('');
                $scope.preview.metrics.allDefaults = $common.isEmptyString($scope.preview.metrics.xml);

                $scope.preview.p2p.xml = $generatorXml.clusterP2p(val).join('');
                $scope.preview.p2p.java = $generatorJava.clusterP2p(val).join('');
                $scope.preview.p2p.allDefaults = $common.isEmptyString($scope.preview.p2p.xml);

                $scope.preview.swap.xml = $generatorXml.clusterSwap(val).join('');
                $scope.preview.swap.java = $generatorJava.clusterSwap(val).join('');
                $scope.preview.swap.allDefaults = $common.isEmptyString($scope.preview.swap.xml);

                $scope.preview.time.xml = $generatorXml.clusterTime(val).join('');
                $scope.preview.time.java = $generatorJava.clusterTime(val).join('');
                $scope.preview.time.allDefaults = $common.isEmptyString($scope.preview.time.xml);

                $scope.preview.pools.xml = $generatorXml.clusterPools(val).join('');
                $scope.preview.pools.java = $generatorJava.clusterPools(val).join('');
                $scope.preview.pools.allDefaults = $common.isEmptyString($scope.preview.pools.xml);

                $scope.preview.transactions.xml = $generatorXml.clusterTransactions(val).join('');
                $scope.preview.transactions.java = $generatorJava.clusterTransactions(val).join('');
                $scope.preview.transactions.allDefaults = $common.isEmptyString($scope.preview.transactions.xml);
            }
            else {
                $scope.preview.general.xml = ' ';
                $scope.preview.general.java = ' ';

                $scope.preview.atomics.xml = ' ';
                $scope.preview.atomics.java = ' ';

                $scope.preview.communication.xml = ' ';
                $scope.preview.communication.java = ' ';

                $scope.preview.deployment.xml = ' ';
                $scope.preview.deployment.java = ' ';

                $scope.preview.events.xml = ' ';
                $scope.preview.events.java = ' ';

                $scope.preview.marshaller.xml = ' ';
                $scope.preview.marshaller.java = ' ';

                $scope.preview.metrics.xml = ' ';
                $scope.preview.metrics.java = ' ';

                $scope.preview.p2p.xml = ' ';
                $scope.preview.p2p.java = ' ';

                $scope.preview.swap.xml = ' ';
                $scope.preview.swap.java = ' ';

                $scope.preview.time.xml = ' ';
                $scope.preview.time.java = ' ';

                $scope.preview.pools.xml = ' ';
                $scope.preview.pools.java = ' ';

                $scope.preview.transactions.xml = ' ';
                $scope.preview.transactions.java = ' ';
            }
        }

        // When landing on the page, get clusters and show them.
        $http.post('clusters/list')
            .success(function (data) {
                $scope.spaces = data.spaces;
                $scope.clusters = data.clusters;
                $scope.caches = _.map(data.caches, function (cache) {
                    return {value: cache._id, label: cache.name, cache: cache};
                });

                var restoredItem = angular.fromJson(sessionStorage.clusterBackupItem);

                if (restoredItem) {
                    if (restoredItem._id) {
                        var idx = _.findIndex($scope.clusters, function (cluster) {
                            return cluster._id == restoredItem._id;
                        });

                        if (idx >= 0) {
                            var cluster = $scope.clusters[idx];

                            var restoredSelectedItem = angular.fromJson(sessionStorage.clusterSelectedItem);

                            // Caches not changed by user. We should take caches from server as they could be changed on Caches screen.
                            if (restoredSelectedItem && _.isEqual(restoredItem.caches, restoredSelectedItem.caches)) {
                                restoredItem.caches = [];

                                _.forEach(cluster.caches, function (cache) {
                                    restoredItem.caches.push(cache)
                                });
                            }
                            else {
                                // Caches changed by user. We need to remove deleted caches (if any).
                                restoredItem.caches = _.filter(restoredItem.caches, function (cacheId) {
                                    return _.findIndex($scope.caches, function (scopeCache) {
                                            return scopeCache.value == cacheId;
                                        }) >= 0;
                                });
                            }

                            $scope.selectItem(cluster, restoredItem, sessionStorage.clusterBackupItemChanged);
                        }
                        else
                            sessionStorage.removeItem('clusterBackupItem');
                    }
                    else
                        $scope.selectItem(undefined, restoredItem, sessionStorage.clusterBackupItemChanged);
                }
                else if ($scope.clusters.length > 0)
                    $scope.selectItem($scope.clusters[0]);

                $scope.$watch('backupItem', function (val) {
                    if (val) {
                        sessionStorage.clusterBackupItem = angular.toJson(val);

                        generatePreview(val);

                        $common.markChanged($scope.ui.inputForm, 'clusterBackupItemChanged');
                    }
                }, true);
            })
            .error(function (errMsg) {
                $common.showError(errMsg);
            });

        $scope.selectItem = function (item, backup, changed) {
            function selectItem() {
                $table.tableReset();

                $scope.selectedItem = item;

                if (item)
                    sessionStorage.clusterSelectedItem = angular.toJson(item);
                else
                    sessionStorage.removeItem('clusterSelectedItem');

                generatePreview();

                $timeout(function () {
                    if (backup)
                        $scope.backupItem = backup;
                    else if (item)
                        $scope.backupItem = angular.copy(item);
                    else
                        $scope.backupItem = undefined;
                });

                $timeout(function () {
                    if (changed)
                        $common.markChanged($scope.ui.inputForm, 'clusterBackupItemChanged');
                    else
                        $common.markPristine($scope.ui.inputForm, 'clusterBackupItemChanged');
                }, 50);
            }

            $common.confirmUnsavedChanges($confirm, $scope.ui.inputForm, selectItem);

            $scope.ui.formTitle = $common.isDefined($scope.backupItem) && $scope.backupItem._id ?
                'Selected cluster: ' + $scope.backupItem.name : 'New cluster';
        };

        // Add new cluster.
        $scope.createItem = function () {
            $table.tableReset();

            $timeout(function () {
                $common.ensureActivePanel($scope.panels, "general", 'clusterName');
            });

            var newItem = {
                discovery: {kind: 'Multicast', Vm: {addresses: ['127.0.0.1:47500..47510']}, Multicast: {}},
                deploymentMode: 'SHARED'
            };

            newItem.caches = [];
            newItem.space = $scope.spaces[0]._id;

            $scope.selectItem(undefined, newItem);
        };

        $scope.indexOfCache = function (cacheId) {
            return _.findIndex($scope.caches, function (cache) {
                return cache.value == cacheId;
            });
        };

        // Check cluster logical consistency.
        function validate(item) {
            if ($common.isEmptyString(item.name))
                return showPopoverMessage($scope.panels, 'general', 'clusterName', 'Name should not be empty');

            if (item.discovery.kind == 'Vm' && item.discovery.Vm.addresses.length == 0)
                return showPopoverMessage($scope.panels, 'general', 'addresses', 'Addresses are not specified');

            if (item.discovery.kind == 'S3' && $common.isEmptyString(item.discovery.S3.bucketName))
                return showPopoverMessage($scope.panels, 'general', 'bucketName', 'Bucket name should not be empty');

            if (item.discovery.kind == 'Cloud') {
                if ($common.isEmptyString(item.discovery.Cloud.identity))
                    return showPopoverMessage($scope.panels, 'general', 'identity', 'Identity should not be empty');

                if ($common.isEmptyString(item.discovery.Cloud.provider))
                    return showPopoverMessage($scope.panels, 'general', 'provider', 'Provider should not be empty');
            }

            if (item.discovery.kind == 'GoogleStorage') {
                if ($common.isEmptyString(item.discovery.GoogleStorage.projectName))
                    return showPopoverMessage($scope.panels, 'general', 'projectName', 'Project name should not be empty');

                if ($common.isEmptyString(item.discovery.GoogleStorage.bucketName))
                    return showPopoverMessage($scope.panels, 'general', 'bucketName', 'Bucket name should not be empty');

                if ($common.isEmptyString(item.discovery.GoogleStorage.serviceAccountP12FilePath))
                    return showPopoverMessage($scope.panels, 'general', 'serviceAccountP12FilePath', 'Private key path should not be empty');

                if ($common.isEmptyString(item.discovery.GoogleStorage.serviceAccountId))
                    return showPopoverMessage($scope.panels, 'general', 'serviceAccountId', 'Account ID should not be empty');
            }

            if (!item.swapSpaceSpi || !item.swapSpaceSpi.kind && item.caches) {
                for (var i = 0; i < item.caches.length; i++) {
                    var idx = $scope.indexOfCache(item.caches[i]);

                    if (idx >= 0) {
                        var cache = $scope.caches[idx];

                        if (cache.cache.swapEnabled) {
                            $scope.ui.expanded = true;

                            return showPopoverMessage($scope.panels, 'swap', 'swapSpaceSpi',
                                'Swap space SPI is not configured, but cache "' + cache.label + '" configured to use swap!');
                        }
                    }
                }
            }

            return true;
        }

        // Save cluster in database.
        function save(item) {
            $http.post('clusters/save', item)
                .success(function (_id) {
                    $common.markPristine($scope.ui.inputForm, 'clusterBackupItemChanged');

                    var idx = _.findIndex($scope.clusters, function (cluster) {
                        return cluster._id == _id;
                    });

                    if (idx >= 0)
                        angular.extend($scope.clusters[idx], item);
                    else {
                        item._id = _id;

                        $scope.clusters.push(item);
                    }

                    $scope.selectItem(item);

                    $common.showInfo('Cluster "' + item.name + '" saved.');
                })
                .error(function (errMsg) {
                    $common.showError(errMsg);
                });
        }

        // Save cluster.
        $scope.saveItem = function () {
            $table.tableReset();

            var item = $scope.backupItem;

            if (validate(item))
                save(item);
        };

        // Copy cluster with new name.
        $scope.copyItem = function () {
            $table.tableReset();

            if (validate($scope.backupItem))
                $copy.show($scope.backupItem.name).then(function (newName) {
                    var item = angular.copy($scope.backupItem);

                    item._id = undefined;
                    item.name = newName;

                    save(item);
                });
        };

        // Remove cluster from db.
        $scope.removeItem = function () {
            $table.tableReset();

            var selectedItem = $scope.selectedItem;

            $confirm.show('Are you sure you want to remove cluster: "' + selectedItem.name + '"?').then(
                function () {
                    $common.markPristine($scope.ui.inputForm, 'clusterBackupItemChanged');

                    var _id = selectedItem._id;

                    $http.post('clusters/remove', {_id: _id})
                        .success(function () {
                            $common.showInfo('Cluster has been removed: ' + selectedItem.name);

                            var clusters = $scope.clusters;

                            var idx = _.findIndex(clusters, function (cluster) {
                                return cluster._id == _id;
                            });

                            if (idx >= 0) {
                                clusters.splice(idx, 1);

                                if (clusters.length > 0)
                                    $scope.selectItem(clusters[0]);
                                else
                                    $scope.selectItem(undefined, undefined);
                            }
                        })
                        .error(function (errMsg) {
                            $common.showError(errMsg);
                        });
                }
            );
        };

        // Remove all clusters from db.
        $scope.removeAllItems = function () {
            $table.tableReset();

            $confirm.show('Are you sure you want to remove all clusters?').then(
                function () {
                    $common.markPristine($scope.ui.inputForm, 'clusterBackupItemChanged');

                    $http.post('clusters/remove/all')
                        .success(function () {
                            $common.showInfo('All clusters have been removed');

                            $scope.clusters = [];

                            $scope.selectItem(undefined, undefined);
                        })
                        .error(function (errMsg) {
                            $common.showError(errMsg);
                        });
                }
            );
        };
    }]
);

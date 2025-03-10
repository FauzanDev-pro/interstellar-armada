/**
 * Copyright 2016-2025 Krisztián Nagy
 * @file Provides the menu screens of the Interstellar Armada game which are simply instances of MenuScreen.
 * @author Krisztián Nagy [nkrisztian89@gmail.com]
 * @licence GNU GPLv3 <http://www.gnu.org/licenses/>
 */

/**
 * @param utils Used for format strings
 * @param application Used to check whether packaged with Electron
 * @param screens The menu screens are instances of MenuScreen.
 * @param game Used for navigation.
 * @param analytics Used for reporting opening of the different menu items.
 * @param constants Used for global localStorage IDs
 * @param armadaScreens Used for common screen constants.
 * @param strings Used for translation support.
 * @param audio Used for volume control
 * @param networking Used to check whether we are in a multi game
 * @param announcements Used to check for new announcements
 * @param battle Used for starting / resuming the battle.
 */
define([
    "utils/utils",
    "modules/application",
    "modules/screens",
    "modules/game",
    "modules/analytics",
    "armada/constants",
    "armada/screens/shared",
    "armada/strings",
    "armada/audio",
    "armada/networking",
    "armada/announcements",
    "armada/screens/battle"
], function (utils, application, screens, game, analytics, constants, armadaScreens, strings, audio, networking, announcements, battle) {
    "use strict";
    var
            // --------------------------------------------------------------------------------------------
            // Constants
            FIRST_RUN_NOTE_SHOWN_LOCAL_STORAGE_ID = constants.LOCAL_STORAGE_PREFIX + "firstRunNoteShown",
            FIRST_MULTI_RUN_NOTE_SHOWN_LOCAL_STORAGE_ID = constants.LOCAL_STORAGE_PREFIX + "firstMultiRunNoteShown",
            // --------------------------------------------------------------------------------------------
            // Private variables
            _releaseNotesShown = false,
            _firstMultiRunNoteShown = false,
            _announcements,
            _mainMenuOptions = [{
                    id: strings.MAIN_MENU.SINGLE_PLAYER.name,
                    action: function () {
                        analytics.sendEvent("newgame");
                        audio.resume();
                        game.setScreen(armadaScreens.SINGLE_PLAYER_SCREEN_NAME);
                    }
                }, {
                    id: strings.MAIN_MENU.MULTIPLAYER.name,
                    action: function () {
                        var launchMulti = function () {
                            analytics.sendEvent("multi");
                            audio.resume();
                            game.setScreen(armadaScreens.MULTI_GAMES_SCREEN_NAME);
                        };
                        // show first multi run message
                        if ((localStorage[FIRST_MULTI_RUN_NOTE_SHOWN_LOCAL_STORAGE_ID] !== "true") && !_firstMultiRunNoteShown) {
                            armadaScreens.openDialog({
                                header: strings.get(strings.FIRST_MULTI_RUN_NOTE.HEADER),
                                message: strings.get(strings.FIRST_MULTI_RUN_NOTE.MESSAGE),
                                buttons: [{
                                        caption: strings.get(strings.FIRST_MULTI_RUN_NOTE.CANCEL_BUTTON),
                                        action: function () {
                                            game.closeSuperimposedScreen();
                                        }
                                    }, {
                                        caption: strings.get(strings.FIRST_MULTI_RUN_NOTE.OK_BUTTON),
                                        action: function () {
                                            _firstMultiRunNoteShown = true;
                                            game.closeSuperimposedScreen();
                                            launchMulti();
                                        }
                                    }, {
                                        caption: strings.get(strings.FIRST_MULTI_RUN_NOTE.DO_NOT_SHOW_AGAIN_BUTTON),
                                        action: function () {
                                            localStorage[FIRST_MULTI_RUN_NOTE_SHOWN_LOCAL_STORAGE_ID] = "true";
                                            game.closeSuperimposedScreen();
                                            launchMulti();
                                        }
                                    }]
                            });
                            // if running a new version for the first time, show release notes of version since the last played one
                        } else {
                            launchMulti();
                        }
                    }
                }, {
                    id: strings.MAIN_MENU.DATABASE.name,
                    action: function () {
                        analytics.sendEvent("database");
                        audio.resume();
                        game.setScreen(armadaScreens.DATABASE_SCREEN_NAME);
                    }
                }, {
                    id: strings.MAIN_MENU.SETTINGS.name,
                    action: function () {
                        analytics.sendEvent("settings");
                        audio.resume();
                        game.setScreen(armadaScreens.SETTINGS_SCREEN_NAME);
                    }
                }, {
                    id: strings.MAIN_MENU.ABOUT.name,
                    action: function () {
                        analytics.sendEvent("about");
                        audio.resume();
                        game.setScreen(armadaScreens.ABOUT_SCREEN_NAME);
                    }
                }];
    /**
     * Shows the new announcements retrieved from the announcement server to the player,
     * unless we already have a dialog open or are in a mission.
     */
    function showAnnouncements() {
        if (_announcements && (_announcements.length > 0) &&
        (game.getScreen() !== game.getScreen(armadaScreens.BATTLE_SCREEN_NAME)) &&
        (game.getScreen() !== game.getScreen(armadaScreens.DIALOG_SCREEN_NAME))) {
            armadaScreens.openDialog({
                header: strings.get(strings.ANNOUNCEMENTS.HEADER),
                message: _announcements.map(function (announcement) {
                    return '<div class="' + armadaScreens.ANNOUNCEMENT_CLASS_NAME + '">' + announcement.text + '</div>';
                }).join(""),
                messageClass: armadaScreens.ANNOUNCEMENTS_CLASS_NAME,
                buttons: [{
                        caption: strings.get(strings.ANNOUNCEMENTS.BUTTON),
                        action: function () {
                            announcements.markAnnouncementsAsRead();
                            game.closeSuperimposedScreen();
                        }
                    }]
            });
            _announcements = null;
        }
    }
    // -------------------------------------------------------------------------
    // The public interface of the module
    return {
        getMainMenuScreen: function () {
            if (application.usesElectron()) {
                _mainMenuOptions.push({
                    id: strings.MAIN_MENU.QUIT.name,
                    action: function () {
                        window.close();
                    }
                });
            }
            return new screens.MenuScreen(
                    armadaScreens.MAIN_MENU_SCREEN_NAME,
                    armadaScreens.MAIN_MENU_SCREEN_SOURCE,
                    {
                        backgroundClassName: armadaScreens.SCREEN_BACKGROUND_CLASS_NAME,
                        containerClassName: armadaScreens.SCREEN_CONTAINER_CLASS_NAME
                    },
                    armadaScreens.MENU_COMPONENT_SOURCE,
                    armadaScreens.MENU_STYLE,
                    _mainMenuOptions,
                    armadaScreens.MAIN_MENU_CONTAINER_ID,
                    {
                        show: function () {
                            var message, newReleases, i;
                            audio.resetMasterVolume();
                            audio.resetMusicVolume();
                            if (_announcements !== null) {
                                announcements.retrieveAnnouncements(function () {
                                    _announcements = announcements.getAnnouncements();
                                    showAnnouncements();
                                }, function (error) {
                                    application.log_DEBUG("Retrieving announcements failed (" + error.error + ")");
                                });
                            }
                            // show first run message
                            if (localStorage[FIRST_RUN_NOTE_SHOWN_LOCAL_STORAGE_ID] !== "true") {
                                localStorage[FIRST_RUN_NOTE_SHOWN_LOCAL_STORAGE_ID] = "true";
                                armadaScreens.openDialog({
                                    header: strings.get(strings.FIRST_RUN_NOTE.HEADER),
                                    message: utils.formatString(strings.get(strings.FIRST_RUN_NOTE.MESSAGE), {
                                        facebook: '<a target="_blank" rel="noopener" href="https://www.facebook.com/interstellar.armada">facebook</a>',
                                        patreon: '<a target="_blank" rel="noopener" href="https://www.patreon.com/c/Entian">Patreon</a>'
                                    }) + (application.usesElectron() ? "" : utils.formatString(strings.get(strings.FIRST_RUN_NOTE.MESSAGE_WEB), {
                                        chrome: '<a target="_blank" rel="noopener" href="https://www.google.com/chrome/">Google Chrome</a>'
                                    })),
                                    buttons: [{
                                            caption: strings.get(strings.FIRST_RUN_NOTE.BUTTON),
                                            action: function () {
                                                audio.resume();
                                                game.closeSuperimposedScreen();
                                                audio.playMusic(armadaScreens.MENU_THEME);
                                                analytics.login();
                                                showAnnouncements();
                                            }
                                        }]
                                });
                                // if running a new version for the first time, show release notes of version since the last played one
                            } else if (!application.isFirstRun() && application.hasVersionChanged() && !_releaseNotesShown) {
                                _releaseNotesShown = true;
                                message = utils.formatString(strings.get(strings.RELEASE_NOTES.GENERAL), {
                                    version: application.getVersion(),
                                    patreon: '<a target="_blank" rel="noopener" href="https://www.patreon.com/c/Entian">Patreon</a>'
                                }) + "<br/><br/>";
                                newReleases = application.getNewReleases();
                                if (newReleases.length > 0) {
                                    for (i = 0; i < newReleases.length; i++) {
                                        message += "<h2>" + newReleases[i] + "</h2>" + utils.formatString(strings.get(strings.RELEASE_NOTES.PREFIX, newReleases[i]));
                                    }
                                } else {
                                    message += utils.formatString(strings.get(strings.RELEASE_NOTES.NO_NEWS), {
                                        github: '<a target="_blank" rel="noopener" href="https://github.com/nkrisztian89/interstellar-armada/releases">Github</a>'
                                    });
                                }
                                armadaScreens.openDialog({
                                    header: strings.get(strings.RELEASE_NOTES.HEADER),
                                    message: message,
                                    messageClass: armadaScreens.RELEASE_NOTES_CLASS_NAME,
                                    buttons: [{
                                            caption: strings.get(strings.RELEASE_NOTES.BUTTON),
                                            action: function () {
                                                audio.resume();
                                                game.closeSuperimposedScreen();
                                                audio.playMusic(armadaScreens.MENU_THEME);
                                                analytics.login();
                                                showAnnouncements();
                                            }
                                        }]
                                });
                            } else {
                                audio.playMusic(armadaScreens.MENU_THEME);
                                analytics.login();
                                showAnnouncements();
                            }
                            armadaScreens.setupFullscreenButton.call(this);
                        },
                        optionselect: armadaScreens.playButtonSelectSound,
                        optionclick: armadaScreens.playButtonClickSound
                    });
        },
        getSinglePlayerMenuScreen: function () {
            return new screens.MenuScreen(
                    armadaScreens.SINGLE_PLAYER_SCREEN_NAME,
                    armadaScreens.SINGLE_PLAYER_SCREEN_SOURCE,
                    {
                        backgroundClassName: armadaScreens.SCREEN_BACKGROUND_CLASS_NAME,
                        containerClassName: armadaScreens.SCREEN_CONTAINER_CLASS_NAME
                    },
                    armadaScreens.MENU_COMPONENT_SOURCE,
                    armadaScreens.MENU_STYLE,
                    [{
                            id: strings.SINGLE_PLAYER_MENU.CAMPAIGN.name,
                            action: function () {
                                game.getScreen(armadaScreens.MISSIONS_SCREEN_NAME).setup({
                                    custom: false,
                                    loadCustom: false,
                                    community: false
                                });
                                game.setScreen(armadaScreens.MISSIONS_SCREEN_NAME);
                            }
                        }, {
                            id: strings.SINGLE_PLAYER_MENU.MY_MISSIONS.name,
                            action: function () {
                                game.getScreen(armadaScreens.MISSIONS_SCREEN_NAME).setup({
                                    custom: true,
                                    loadCustom: true,
                                    community: false
                                });
                                game.setScreen(armadaScreens.MISSIONS_SCREEN_NAME);
                            }
                        }, {
                            id: strings.SINGLE_PLAYER_MENU.COMMUNITY_MISSIONS.name,
                            action: function () {
                                game.getScreen(armadaScreens.MISSIONS_SCREEN_NAME).setup({
                                    custom: true,
                                    loadCustom: false,
                                    community: true
                                });
                                game.setScreen(armadaScreens.MISSIONS_SCREEN_NAME);
                            }
                        }, {
                            id: strings.SCREEN.BACK.name,
                            action: function () {
                                game.setScreen(armadaScreens.MAIN_MENU_SCREEN_NAME);
                            }
                        }],
                    armadaScreens.SINGLE_PLAYER_MENU_CONTAINER_ID,
                    armadaScreens.MENU_EVENT_HANDLERS,
                    {
                        "escape": function () {
                            game.setScreen(armadaScreens.MAIN_MENU_SCREEN_NAME);
                        }
                    });
        },
        getSettingsMenuScreen: function () {
            return new screens.MenuScreen(
                    armadaScreens.SETTINGS_SCREEN_NAME,
                    armadaScreens.SETTINGS_SCREEN_SOURCE,
                    {
                        backgroundClassName: armadaScreens.SCREEN_BACKGROUND_CLASS_NAME,
                        containerClassName: armadaScreens.SCREEN_CONTAINER_CLASS_NAME
                    },
                    armadaScreens.MENU_COMPONENT_SOURCE,
                    armadaScreens.MENU_STYLE,
                    [{
                            id: strings.SETTINGS.GENERAL.name,
                            action: function () {
                                game.setScreen(armadaScreens.GENERAL_SETTINGS_SCREEN_NAME);
                            }
                        }, {
                            id: strings.SETTINGS.GRAPHICS.name,
                            action: function () {
                                game.setScreen(armadaScreens.GRAPHICS_SCREEN_NAME);
                            }
                        }, {
                            id: strings.SETTINGS.AUDIO.name,
                            action: function () {
                                game.setScreen(armadaScreens.AUDIO_SCREEN_NAME);
                            }
                        }, {
                            id: strings.SETTINGS.GAMEPLAY.name,
                            action: function () {
                                game.setScreen(armadaScreens.GAMEPLAY_SETTINGS_SCREEN_NAME);
                            }
                        }, {
                            id: strings.SETTINGS.CONTROLS.name,
                            action: function () {
                                game.setScreen(armadaScreens.CONTROLS_SCREEN_NAME);
                            }
                        }, {
                            id: strings.SCREEN.BACK.name,
                            action: function () {
                                game.setScreen(armadaScreens.MAIN_MENU_SCREEN_NAME);
                            }
                        }],
                    armadaScreens.SETTINGS_MENU_CONTAINER_ID,
                    armadaScreens.MENU_EVENT_HANDLERS,
                    {
                        "escape": function () {
                            game.setScreen(armadaScreens.MAIN_MENU_SCREEN_NAME);
                        }
                    });
        },
        getIngameMenuScreen: function () {
            return new screens.MenuScreen(
                    armadaScreens.INGAME_MENU_SCREEN_NAME,
                    armadaScreens.INGAME_MENU_SCREEN_SOURCE,
                    {
                        cssFilename: armadaScreens.INGAME_MENU_SCREEN_CSS,
                        backgroundClassName: armadaScreens.SCREEN_BACKGROUND_CLASS_NAME,
                        containerClassName: armadaScreens.SCREEN_CONTAINER_CLASS_NAME
                    },
                    armadaScreens.MENU_COMPONENT_SOURCE,
                    armadaScreens.MENU_STYLE,
                    [{
                            id: strings.INGAME_MENU.RESUME.name,
                            action: function () {
                                game.closeSuperimposedScreen();
                                battle.resumeBattle();
                            }
                        }, {
                            id: strings.SETTINGS.CONTROLS.name,
                            action: function () {
                                game.setScreen(armadaScreens.CONTROLS_SCREEN_NAME, true, armadaScreens.SUPERIMPOSE_BACKGROUND_COLOR);
                            }
                        }, {
                            id: strings.SETTINGS.AUDIO.name,
                            action: function () {
                                game.setScreen(armadaScreens.AUDIO_SCREEN_NAME, true, armadaScreens.SUPERIMPOSE_BACKGROUND_COLOR);
                            }
                        }, {
                            id: strings.SETTINGS.GAMEPLAY.name,
                            action: function () {
                                game.setScreen(armadaScreens.GAMEPLAY_SETTINGS_SCREEN_NAME, true, armadaScreens.SUPERIMPOSE_BACKGROUND_COLOR);
                            }
                        }, {
                            id: strings.INGAME_MENU.RESTART.name,
                            isVisible: function () {
                                return !networking.isInGame();
                            },
                            action: function () {
                                armadaScreens.openDialog({
                                    header: strings.get(strings.INGAME_MENU.RESTART_HEADER),
                                    message: strings.get(strings.INGAME_MENU.RESTART_MESSAGE),
                                    buttons: [{
                                            caption: strings.get(strings.SCREEN.CANCEL),
                                            action: function () {
                                                game.closeSuperimposedScreen();
                                            }
                                        }, {
                                            caption: strings.get(strings.INGAME_MENU.RESTART_RESTART),
                                            action: function () {
                                                game.closeSuperimposedScreen();
                                                game.closeSuperimposedScreen();
                                                game.getScreen().startNewBattle({
                                                    restart: true
                                                });
                                            }
                                        }
                                    ]
                                });
                            }
                        }, {
                            id: strings.INGAME_MENU.QUIT.name,
                            isVisible: function () {
                                return !networking.isInGame();
                            },
                            action: function () {
                                armadaScreens.openDialog({
                                    header: strings.get(strings.INGAME_MENU.QUIT_HEADER),
                                    message: strings.get(strings.INGAME_MENU.QUIT_MESSAGE),
                                    buttons: [{
                                            caption: strings.get(strings.SCREEN.CANCEL),
                                            action: function () {
                                                game.closeSuperimposedScreen();
                                            }
                                        }, {
                                            caption: strings.get(strings.INGAME_MENU.QUIT_TO_MISSIONS),
                                            action: function () {
                                                var missionName = battle.getMissionName();
                                                game.setScreen(armadaScreens.MISSIONS_SCREEN_NAME);
                                                game.getScreen().selectMission(missionName);
                                            }
                                        }, {
                                            caption: strings.get(strings.INGAME_MENU.QUIT_TO_MAIN_MENU),
                                            action: function () {
                                                game.setScreen(armadaScreens.MAIN_MENU_SCREEN_NAME);
                                            }
                                        }
                                    ]
                                });
                            }
                        }, {
                            id: strings.INGAME_MENU.QUIT_MULTI.name,
                            isVisible: function () {
                                return networking.isInGame();
                            },
                            action: function () {
                                armadaScreens.openDialog({
                                    header: strings.get(strings.INGAME_MENU.QUIT_MULTI_HEADER),
                                    message: strings.get(strings.INGAME_MENU.QUIT_MULTI_MESSAGE),
                                    buttons: [{
                                            caption: strings.get(strings.SCREEN.CANCEL),
                                            action: function () {
                                                game.closeSuperimposedScreen();
                                            }
                                        }, {
                                            caption: strings.get(strings.INGAME_MENU.QUIT_TO_SCORE),
                                            action: function () {
                                                game.setScreen(armadaScreens.MULTI_SCORE_SCREEN_NAME);
                                                networking.leaveGame();
                                            }
                                        }, {
                                            caption: strings.get(strings.INGAME_MENU.QUIT_TO_MAIN_MENU),
                                            action: function () {
                                                networking.onDisconnect(null);
                                                networking.disconnect();
                                                game.setScreen(armadaScreens.MAIN_MENU_SCREEN_NAME);
                                            }
                                        }
                                    ]
                                });
                            }
                        }],
                    armadaScreens.INGAME_MENU_CONTAINER_ID,
                    armadaScreens.MENU_EVENT_HANDLERS,
                    {
                        "escape": function (event) {
                            if (!event.repeat) {
                                game.closeSuperimposedScreen();
                                battle.resumeBattle(false, true);
                            }
                        }
                    });
        }
    };
});

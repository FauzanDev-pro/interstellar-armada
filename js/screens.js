/**
 * @fileOverview This file defines the GameScreen class and its descendant
 * classes, which load and manipulate the DOM of the HTML pages and control
 * the rendering of scenes to the canvas elements.
 * @author <a href="mailto:nkrisztian89@gmail.com">Krisztián Nagy</a>
 * @version 0.1
 */

/**********************************************************************
    Copyright 2014 Krisztián Nagy
    
    This file is part of Interstellar Armada.

    Interstellar Armada is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Interstellar Armada is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Interstellar Armada.  If not, see <http://www.gnu.org/licenses/>.
 ***********************************************************************/

"uses strict";

/**
 * Defines a GameScreen object.
 * @class Holds the logical model of a screen of the game. The different
 * screens should be defined as descendants of this class.
 * @param {String} name The name by which this screen can be identified.
 * @param {String} source The name of the HTML file where the structure of this
 * screen is defined.
 * @returns {GameScreen}
 */
function GameScreen(name,source) {
    Resource.call(this);
    // general properties
    this._name=name;
    this._source=source;
    this._model=null;
    this._background = null;
    this._container = null;
    
    this._simpleComponents = new Array();
    this._externalComponents = new Array();
    
    // function to execute when the model is loaded
    this._onModelLoad = function() {};
        
    // source will be undefined when setting the prototypes for inheritance
    if(source!==undefined) {
        this.requestModelLoad();
    }
}

GameScreen.prototype = new Resource();
GameScreen.prototype.constructor = GameScreen;

/**
 * Initiates the asynchronous loading of the screen's structure from the
 * external HTML file.
 */
GameScreen.prototype.requestModelLoad = function() {
    // send an asynchronous request to grab the HTML file containing the DOM of
    // this screen
    var request = new XMLHttpRequest();
    request.open('GET', location.pathname+this._source+"?123", true);
    var self = this;
    request.onreadystatechange = function() {
        if (request.readyState === 4) {
            self._model = document.implementation.createHTMLDocument(self._name);
            self._model.documentElement.innerHTML = this.responseText;
            self._onModelLoad();
            self.setToReady();
        }
    };
    request.send(null);
};

/**
 * Getter for the _name property.
 * @returns {String}
 */
GameScreen.prototype.getName = function() {
    return this._name;
};

/**
 * Replaces the current HTML page's body with the sctructure of the screen.
 */
GameScreen.prototype.replacePageWithScreen = function() {
    document.body.innerHTML = "";
    this.addScreenToPage();
};

/**
 * Appends the content of the screen to the page in an invisible (display: none)
 * div.
 */
GameScreen.prototype.addScreenToPage = function() {
    var self = this;
    this.executeWhenReady(function() {
        self._background = document.createElement("div");
        self._background.setAttribute("id",self._name+"PageBackground");
        self._background.className = "fullScreenFix";
        self._background.style.display = "none";
        self._container = document.createElement("div");
        self._container.setAttribute("id",self._name+"PageContainer");
        self._container.className = "fullScreenContainer";
        self._container.style.display = "none";
        self._container.innerHTML = self._model.body.innerHTML;
        var namedElements = self._container.querySelectorAll("[id]");
        for(var i = 0; i<namedElements.length; i++) {
            namedElements[i].setAttribute("id",self._name+"_"+namedElements[i].getAttribute("id"));
        }
        document.body.appendChild(self._background);
        document.body.appendChild(self._container);
        self._initializeComponents();
    });
};

GameScreen.prototype.show = function() {
    this.executeWhenReady(function() {
        this._container.style.display = "block";
    });
};

/**
 * Superimposes the screen on the current page, by appending a full screen
 * container and the screen structure as its child inside it.
 * @param {Number[3]} backgroundColor The color of the full screen background. ([r,g,b],
 * where all color components should be 0-255)
 * @param {Number} backgroundOpacity The opacity of the background (0.0-1.0)
 */
GameScreen.prototype.superimposeOnPage = function(backgroundColor,backgroundOpacity) {
    this.executeWhenReady(function() {
        this._background.style.backgroundColor = "rgba("+backgroundColor[0]+","+backgroundColor[1]+","+backgroundColor[2]+","+backgroundOpacity+")";
        this._background.style.display = "block";
        document.body.appendChild(this._background);
        document.body.appendChild(this._container);
        this.show();
    });
};

GameScreen.prototype.hide = function() {
    this.executeWhenReady(function() {
        this._container.style.display = "none";
        this._background.style.display = "none";
    });
};

/**
 * Tells whether the screen is superimposed on top of another one.
 * @returns {Boolean}
 */
GameScreen.prototype.isSuperimposed = function() {
    return this._background.style.display !== "none";
};

/**
 * Executes the necessary actions required when closing the page. This method
 * only nulls out the default components, additional functions need to be added
 * in the descendant classes.
 */
GameScreen.prototype.removeFromPage = function() {
    var i;
    for(i=0;i<this._simpleComponents.length;i++) {
        this._simpleComponents[i].resetComponent();
    }
    for(var i=0;i<this._externalComponents.length;i++) {
        this._externalComponents[i].component.resetComponent();
    }
    document.dody.removeChild(this._background);
    document.dody.removeChild(this._container);
    this._background = null;
    this._container = null;
};

/**
 * Setting the properties that will be used to easier access DOM elements later.
 * In descendants, this method should be overwritten, adding the additional
 * components of the screen after calling this parent method.
 */
GameScreen.prototype._initializeComponents = function() {
    var i;
    for (i = 0; i < this._simpleComponents.length; i++) {
        this._simpleComponents[i].initComponent();
    }
    for (i = 0; i < this._externalComponents.length; i++) {
        var parentNode;
        if (this._externalComponents[i].parentNodeID !== undefined) {
            parentNode = document.getElementById(this._name+"_"+this._externalComponents[i].parentNodeID);
        }
        // otherwise just leave it undefined, nothing to pass to the method below
        this.addExternalComponent(this._externalComponents[i].component, parentNode);
    }
};

GameScreen.prototype.registerSimpleComponent = function(simpleComponentName) {
    var component = new SimpleComponent(this._name+"_"+simpleComponentName);
    this._simpleComponents.push(component);
    return component;
};

GameScreen.prototype.registerExternalComponent = function(screenComponent,parentNodeID) {
    this._externalComponents.push({
        component: screenComponent,
        parentNodeID: parentNodeID
    });
    return screenComponent;
};

/**
 * Appends the elements of an external component (a HTML document fragment
 * defined in an external xml file) to the DOM tree and returns the same 
 * component.
 * @param {ScreenComponent} screenComponent
 * @param {Node} [parentNode] The node in the document to which to append the
 * component (if omitted, it will be appended to the body)
 * @returns {ScreenComponent}
 */
GameScreen.prototype.addExternalComponent = function(screenComponent,parentNode) {
    screenComponent.appendToPage(parentNode);
    return screenComponent;
};

/**
 * Provides visual information to the user about the current status of the game.
 * @param {String} newStatus The new status to display.
 */
GameScreen.prototype.updateStatus = function(newStatus) {
    if (this._status!==null) {
        this._status.setContent(newStatus);
    } else {
        alert(newStatus);
    }
};

/**
 * An enhanced canvas element (a wrapper around a regular HTML canvas), that
 * can create and hold a reference to a managed WebGL context for the canvas.
 * @param {HTMLCanvasElement} canvas The canvas around which this object should
 * be created.
 * @returns {ScreenCanvas}
 */
function ScreenCanvas(canvas) {
    this._canvas = canvas;
    this._name = canvas.getAttribute("id");
    this._resizeable = canvas.classList.contains("resizeable");
    this._context = null;
}

/**
 * Returns the stored HTML canvas element.
 * @returns {HTMLCanvasElement}
 */
ScreenCanvas.prototype.getCanvasElement = function() {
    return this._canvas;
};

/**
 * Tells if the canvas is resizeable = if it has a dynamic size that changes
 * when the window is resized.
 * @returns {Boolean}
 */
ScreenCanvas.prototype.isResizeable = function() {
    return this._resizeable;
};

/**
 * Returns a managed WebGL context created for the canvas. It creates the 
 * context if it does not exist yet.
 * @returns {ManagedGLContext}
 */
ScreenCanvas.prototype.getManagedContext = function() {
    if(this._context === null) {
        this._context = new ManagedGLContext(this._canvas.getAttribute("id"),this._canvas,game.graphicsContext.getAntialiasing(),game.graphicsContext.getFiltering());
    }
    return this._context;
};

/**
 * Defines a game screen with canvases object.
 * @class Represents a game screen that has one or more canvases where WebGL
 * scenes can be rendered.
 * @extends GameScreen
 * @param {String} name The name by which this screen can be identified.
 * @param {String} source The name of the HTML file where the structure of this
 * screen is defined.
 * @returns {GameScreenWithCanvases}
 */
function GameScreenWithCanvases(name,source) {
    GameScreen.call(this,name,source);
    
    this._canvases = new Object();
        
    this._sceneCanvasBindings = new Array();
    
    this._renderLoop = null;
    
    this._renderTimes = null;
    
    this._resizeEventListener = null;
};

GameScreenWithCanvases.prototype=new GameScreen();
GameScreenWithCanvases.prototype.constructor=GameScreenWithCanvases;

/**
 * Stops the render loop and nulls out the components.
 */
GameScreenWithCanvases.prototype.removeFromPage = function() {
    GameScreen.prototype.removeFromPage.call(this);
    
    this.stopRenderLoop();
    
    window.removeEventListener("resize",this._resizeEventListener);
    this._resizeEventListener = null;
    
    this._canvases = new Object();
        
    this._sceneCanvasBindings = new Array();
    
    game.graphicsContext.resourceManager.clearResourceContextBindings();
};

GameScreenWithCanvases.prototype.hide = function() {
    GameScreen.prototype.hide.call(this);
    this.stopRenderLoop();
};

/**
 * Initializes the components of the parent class, then the additional ones for
 * this class (the canvases).
 */
GameScreenWithCanvases.prototype._initializeComponents = function() {
    GameScreen.prototype._initializeComponents.call(this);
    
    var canvasElements = document.getElementsByTagName("canvas");
    for(var i=0;i<canvasElements.length;i++) {
        this._canvases[canvasElements[i].getAttribute("id")] = new ScreenCanvas(canvasElements[i]);
    }
    
    var self = this;
    this._resizeEventListener = function() { self.resizeCanvases.call(self); };
    window.addEventListener("resize",this._resizeEventListener);
};

/**
 * Returns the stored canvas component that has the passed name.
 * @param {String} name
 * @returns {ScreenCanvas}
 */
GameScreenWithCanvases.prototype.getScreenCanvas = function(name) {
    return this._canvases[this._name+"_"+name];
}; 

/**
 * Creates a binding between the passed scene and canvas, causing the scene to
 * be rendered on the canvas automatically in the render loop of this screen.
 * @param {Scene} scene
 * @param {ScreenCanvas} canvas
 */
GameScreenWithCanvases.prototype.bindSceneToCanvas = function(scene,canvas) {
    var alreadyBound = false;
    for(var i=0;i<this._sceneCanvasBindings.length;i++) {
        if(
            (this._sceneCanvasBindings[i].scene===scene)&&
            (this._sceneCanvasBindings[i].canvas===canvas)
        ) {
            alreadyBound = true;
        }
    }
    if (alreadyBound === false) {
        this._sceneCanvasBindings.push({
            scene: scene,
            canvas: canvas
        });
    }
    scene.addToContext(canvas.getManagedContext());
    if(this._renderLoop !== null) {
        canvas.getManagedContext().setupVertexBuffers();
    }
};

/**
 * Renders the scenes displayed on this screen.
 */
GameScreenWithCanvases.prototype.render = function() {
    var i;
    for(i=0;i<this._sceneCanvasBindings.length;i++) {
        this._sceneCanvasBindings[i].scene.cleanUp();
        this._sceneCanvasBindings[i].scene.render(this._sceneCanvasBindings[i].canvas.getManagedContext());
    }
    if(this._renderLoop!==null) {
        var d = new Date();
        this._renderTimes.push(d);
        while((this._renderTimes.length>1)&&((d-this._renderTimes[0])>1000)) {
            this._renderTimes.shift();
        }
    }
};

/**
 * Starts the render loop, by beginning to execute the render function every
 * interval milliseconds.
 * @param {Number} interval
 */
GameScreenWithCanvases.prototype.startRenderLoop = function(interval) {
    var i;
    for(i=0;i<this._sceneCanvasBindings.length;i++) {
        this._sceneCanvasBindings[i].canvas.getManagedContext().setupVertexBuffers();
    }
    var self = this;
    this._renderTimes = [new Date()];
    this._renderLoop = setInterval(function() { self.render(); },interval);
};

/**
 * Stops the render loop.
 */
GameScreenWithCanvases.prototype.stopRenderLoop = function() {
    clearInterval(this._renderLoop);
    this._renderLoop = null;
};

/**
 * Returns the Frames Per Second count for this screen's render loop.
 * @returns {Number}
 */
GameScreenWithCanvases.prototype.getFPS = function() {
    return this._renderTimes.length;
};

GameScreenWithCanvases.prototype.resizeCanvas = function(name) {
    var i;
    var canvasElement = this._canvases[name].getCanvasElement();
    var width = canvasElement.clientWidth;
    var height = canvasElement.clientHeight;
    if (canvasElement.width !== width ||
        canvasElement.height !== height) {
        // Change the size of the canvas to match the size it's being displayed
        canvasElement.width = width;
        canvasElement.height = height;
    }
    // updated the variables in the scenes
    for (i = 0; i < this._sceneCanvasBindings.length; i++) {
        if(this._sceneCanvasBindings[i].canvas===this._canvases[name]) {
            this._sceneCanvasBindings[i].scene.resizeViewport(
                canvasElement.width,
                canvasElement.height
            );
        }
    }
};

/**
 * Updates all needed variables when the screen is resized (camera perspective
 * matrices as well!)
 */
GameScreenWithCanvases.prototype.resizeCanvases = function() {
    // first, update the canvas width and height properties if the client width/
    // height has changed
    for (var canvasName in this._canvases) {
        if(this._canvases[canvasName].isResizeable()===true) {
            this.resizeCanvas(canvasName);
        }
    }
};

/**
 * Defines a battle screen object.
 * @class Represents the battle screen.
 * @extends GameScreenWithCanvases
 * @param {String} name The name by which this screen can be identified.
 * @param {String} source The name of the HTML file where the structure of this
 * screen is defined.
 * @returns {BattleScreen}
 */
function BattleScreen(name,source) {
    GameScreenWithCanvases.call(this,name,source);
        
    this._stats = this.registerSimpleComponent("stats");
    this._ui = this.registerSimpleComponent("ui");
    
    this._loadingBox = this.registerExternalComponent(new LoadingBox(name+"_loadingBox","loadingbox.html","loadingbox.css"));
    this._infoBox = this.registerExternalComponent(new InfoBox(name+"_infoBox","infobox.html","infobox.css"));
    
    this._level = null;
    this._simulationLoop = null;
};

BattleScreen.prototype=new GameScreenWithCanvases();
BattleScreen.prototype.constructor=BattleScreen;

BattleScreen.prototype.hide = function() {
    GameScreenWithCanvases.prototype.hide.call(this);
    clearInterval(this._simulationLoop);
    this._simulationLoop = null;
    this._level = null;
    game.graphicsContext.scene = null;
};

/**
 * Getter for the _loadingBox property.
 * @returns {LoadingBox}
 */
BattleScreen.prototype.getLoadingBox = function() {
    return this._loadingBox;
};

/**
 * Getter for the _infoBox property.
 * @returns {InfoBox}
 */
BattleScreen.prototype.getInfoBox = function() {
    return this._infoBox;
};

/**
 * Uses the loading box to show the status to the user.
 * @param {String} newStatus The status to show on the loading box. If
 * undefined, the status won't be updated.
 * @param {Number} newProgress The new value of the progress bar on the loading
 * box. If undefined, the value won't be updated.
 */
BattleScreen.prototype.updateStatus = function(newStatus,newProgress) {
    if(newStatus!==undefined) {
        this._loadingBox.updateStatus(newStatus);
    }
    if(newProgress!==undefined) {
        this._loadingBox.updateProgress(newProgress);
    }
};

/**
 * Hides the stats (FPS, draw stats) component.
 */
BattleScreen.prototype.hideStats = function() {
    this._stats.hide();
};

/**
 * Hides the UI (information about controlled spacecraft) component.
 */
BattleScreen.prototype.hideUI = function() {
    this._ui.hide();
};

/**
 * Shows the stats (FPS, draw stats) component.
 */
BattleScreen.prototype.showStats = function() {
    this._stats.show();
};

/**
 * Shows the UI (information about controlled spacecraft) component.
 */
BattleScreen.prototype.showUI = function() {
    this._ui.show();
};

/**
 * Shows the given message to the user in an information box.
 * @param {String} message
 */
BattleScreen.prototype.showMessage = function(message) {
    this._infoBox.updateMessage(message);
    this._infoBox.show();
};

BattleScreen.prototype.render = function() {
    GameScreenWithCanvases.prototype.render.call(this);
    this._stats.setContent(this.getFPS()+"<br/>"+this._sceneCanvasBindings[0].scene.getNumberOfDrawnTriangles());
};

BattleScreen.prototype.startNewBattle = function(levelSourceFilename) {
    document.body.style.cursor='wait';
    this.hideStats();
    this.hideUI();
    this._loadingBox.show();
    this._infoBox.hide();
    this.resizeCanvases(); 
    
    this._level = new Level();
    game.logicContext.level = this._level;
    
    var self = this;
    
    this._level.onLoad = function () {
        self.updateStatus("loading additional configuration...", 5);
        self._level.addRandomShips("human",{falcon: 30, viper: 10, aries: 5, taurus: 10}, 3000);
        
        self.updateStatus("building scene...",10);
        var canvas = self.getScreenCanvas("battleCanvas").getCanvasElement();
        game.graphicsContext.scene = new Scene(0,0,canvas.width,canvas.height,true,[true,true,true,true],[0,0,0,1],true,game.graphicsContext.getLODContext());
        self._level.buildScene(game.graphicsContext.scene);

        self.updateStatus("loading graphical resources...",15);
        game.graphicsContext.resourceManager.onResourceLoad = function(resourceName,totalResources,loadedResources) {
            self.updateStatus("loaded "+resourceName+", total progress: "+loadedResources+"/"+totalResources,20+(loadedResources/totalResources)*60);
        };
        var freq = 60;
        game.graphicsContext.resourceManager.executeWhenReady(function() { 
            self.updateStatus("initializing WebGL...",75);
            self.bindSceneToCanvas(game.graphicsContext.scene,self.getScreenCanvas("battleCanvas"));
            self._level.addProjectileResourcesToContext(self.getScreenCanvas("battleCanvas").getManagedContext());
            self.updateStatus("",100);
            self.showMessage("Ready!");
            self.getLoadingBox().hide();
            self.showStats();
            self.startRenderLoop(1000/freq);
            document.body.style.cursor='default';
        });
        
        game.graphicsContext.resourceManager.requestResourceLoad();

        game.controlContext.activate();

        var prevDate = new Date();
        
        self._simulationLoop = setInterval(function ()
        {
            var curDate = new Date();
            self._level.tick(curDate - prevDate);
            prevDate = curDate;
            control(game.graphicsContext.scene, self._level, game.controlContext.globalActions);
        }, 1000 / freq);
    };
    
    self.updateStatus("loading level information...",0);
    this._level.requestLoadFromFile(levelSourceFilename);
};

/**
 * Defines a database screen object.
 * @class Represents the database screen.
 * @extends GameScreenWithCanvases
 * @param {String} name The name by which this screen can be identified.
 * @param {String} source The name of the HTML file where the structure of this
 * screen is defined.
 * @returns {DatabaseScreen}
 */
function DatabaseScreen(name,source) {
    GameScreenWithCanvases.call(this,name,source);
    
    this._itemName = this.registerSimpleComponent("itemName");
    this._itemType = this.registerSimpleComponent("itemType");
    this._itemDescription = this.registerSimpleComponent("itemDescription");
    
    this._backButton = this.registerSimpleComponent("backButton");
    this._prevButton = this.registerSimpleComponent("prevButton");
    this._nextButton = this.registerSimpleComponent("nextButton");
    this._loadingBox = this.registerExternalComponent(new LoadingBox(name+"_loadingBox","loadingbox.html","loadingbox.css"));
    
    this._scene = null;
    this._item = null;
    this._itemIndex = null;
    this._animationLoop = null;
    this._revealLoop = null;
    this._rotationLoop = null;
    this._solidModel = null;
    this._wireframeModel = null;
    
    this._mousePos = null;
};

DatabaseScreen.prototype=new GameScreenWithCanvases();
DatabaseScreen.prototype.constructor=DatabaseScreen;

/**
 * Nulls out the components.
 */
DatabaseScreen.prototype.removeFromPage = function() {
    GameScreenWithCanvases.prototype.removeFromPage.call(this);
        
    this._itemLength = null;
    this._itemFront = null;
    this._revealState = null;
    
    this.stopRevealLoop();
    this.stopRotationLoop();
    this._item = null;
    this._itemIndex = null;
    this._scene = null;
    this._solidModel = null;
    this._wireframeModel = null;
    
    this._mousePos = null;
};

/**
 * Initializes the components of the parent class, then the additional ones for
 * this class.
 */
DatabaseScreen.prototype._initializeComponents = function() {
    GameScreenWithCanvases.prototype._initializeComponents.call(this);
    
    var self = this;
    
    this._backButton.getElement().onclick = function() {
        self.stopRevealLoop();
        self.stopRotationLoop();
        if(self.isSuperimposed()) {
            game.closeSuperimposedScreen();
        } else {
            game.setCurrentScreen('mainMenu');
        }
    };
    this._prevButton.getElement().onclick = function(){
        self.selectPreviousShip();
    };
    this._nextButton.getElement().onclick = function(){
        self.selectNextShip();
    };
};

/**
 * Getter for the _loadingBox property.
 * @returns {LoadingBox}
 */
DatabaseScreen.prototype.getLoadingBox = function() {
    return this._loadingBox;
};

/**
 * Uses the loading box to show the status to the user.
 * @param {String} newStatus The status to show on the loading box. If
 * undefined, the status won't be updated.
 * @param {Number} newProgress The new value of the progress bar on the loading
 * box. If undefined, the value won't be updated.
 */
DatabaseScreen.prototype.updateStatus = function(newStatus,newProgress) {
    if(newStatus!==undefined) {
        this._loadingBox.updateStatus(newStatus);
    }
    if(newProgress!==undefined) {
        this._loadingBox.updateProgress(newProgress);
    }
};

DatabaseScreen.prototype.startRevealLoop = function() {
    var prevDate = new Date();
    var self = this;    
    this._revealLoop = setInterval(function ()
    {
        var curDate = new Date();
        if(self._revealState<2.0) {
            self._revealState += (curDate-prevDate)/1000/2;
        } else {
            self.stopRevealLoop();
        }
        prevDate = curDate;
    }, 1000 / 60);
};

DatabaseScreen.prototype.startRotationLoop = function() {
    // turn the ship to start the rotation facing the camera
    this._solidModel.setOrientationMatrix(identityMatrix4());
    this._solidModel.rotate([0.0,0.0,1.0],Math.PI);
    this._solidModel.rotate([1.0,0.0,0.0],60/180*Math.PI);
    this._wireframeModel.setOrientationMatrix(identityMatrix4());
    this._wireframeModel.rotate([0.0,0.0,1.0],Math.PI);
    this._wireframeModel.rotate([1.0,0.0,0.0],60/180*Math.PI);
    var prevDate = new Date();
    var self = this;    
    this._rotationLoop = setInterval(function ()
    {
        var curDate = new Date();
        self._solidModel.rotate(self._item.visualModel.getZDirectionVector(),(curDate-prevDate)/1000*Math.PI/2);
        self._wireframeModel.rotate(self._item.visualModel.getZDirectionVector(),(curDate-prevDate)/1000*Math.PI/2);
        prevDate = curDate;
    }, 1000 / 60);
};

DatabaseScreen.prototype.stopRevealLoop = function() {
    clearInterval(this._revealLoop);
    this._revealLoop = null;
};

DatabaseScreen.prototype.stopRotationLoop = function() {
    clearInterval(this._rotationLoop);
    this._rotationLoop = null;
};

DatabaseScreen.prototype.show = function() {
    GameScreenWithCanvases.prototype.show.call(this);
    this.executeWhenReady(function() {
        this.initializeCanvas();
    });
};

DatabaseScreen.prototype.hide = function() {
    GameScreenWithCanvases.prototype.hide.call(this);
    this.executeWhenReady(function() {
        this._scene.clearObjects();
        this.render();
    });
};

DatabaseScreen.prototype.initializeCanvas = function() {
    var self = this;
    
    this._loadingBox.show();
    this.updateStatus("initializing database...", 0);
        
    this.resizeCanvas(this._name+"_databaseCanvas");
    var canvas = this.getScreenCanvas("databaseCanvas").getCanvasElement();
    // create a new scene and add a directional light source which will not change
    // while different objects are shown
    this._scene = new Scene(0,0,canvas.clientWidth,canvas.clientHeight,true,[true,true,true,true],[0,0,0,0],true,game.graphicsContext.getLODContext());
    this._scene.addLightSource(new LightSource([1.0,1.0,1.0],[-1.0,0.0,1.0]));

    game.graphicsContext.resourceManager.onResourceLoad = function(resourceName,totalResources,loadedResources) {
        self.updateStatus("loaded "+resourceName+", total progress: "+loadedResources+"/"+totalResources,20+(loadedResources/totalResources)*60);
    };
    game.graphicsContext.resourceManager.executeWhenReady(function() { 
        self.updateStatus("",100);
        self._loadingBox.hide();
    });
    
    this.updateStatus("loading graphical resources...",15);
    
    this._itemIndex = 0;
    this.loadShip();
    
    // when the user presses the mouse on the canvas, he can start rotating the model
    // by moving the mouse
    canvas.onmousedown = function(e) {
        self._mousePos = [e.screenX,e.screenY];
        // automatic rotation should stop for the time of manual rotation
        self.stopRotationLoop();
        // the mouse might go out from over the canvas during rotation, so register the
        // move event handler on the document body
        document.body.onmousemove = function(e) {
            self._solidModel.rotate([0.0,1.0,0.0],-(e.screenX-self._mousePos[0])/180*Math.PI);
            self._solidModel.rotate([1.0,0.0,0.0],-(e.screenY-self._mousePos[1])/180*Math.PI);
            self._wireframeModel.rotate([0.0,1.0,0.0],-(e.screenX-self._mousePos[0])/180*Math.PI);
            self._wireframeModel.rotate([1.0,0.0,0.0],-(e.screenY-self._mousePos[1])/180*Math.PI);
            self._mousePos = [e.screenX,e.screenY];
        };
        // once the user releases the mouse button, the event handlers should be cancelled
        // and the automatic rotation started again
        document.body.onmouseup = function() {
            document.body.onmousemove = null;
            document.body.onmouseup = null;
            self.startRotationLoop();
        };
    };
};

/**
 * Selects and displays the previous spacecraft class from the list on the database
 * screen. Loops around.
 */
DatabaseScreen.prototype.selectPreviousShip = function() {
    // using % operator does not work with -1, reverted to "if"
    this._itemIndex -= 1;
    if(this._itemIndex===-1) {
        this._itemIndex = game.logicContext.getSpacecraftClasses().length-1;
    }
    this.loadShip();
};

/**
 * Selects and displays the next spacecraft class from the list on the database
 * screen. Loops around.
 */
DatabaseScreen.prototype.selectNextShip = function() {
    this._itemIndex = (this._itemIndex+1)%game.logicContext.getSpacecraftClasses().length;
    this.loadShip();
};

/**
 * Load the information and model of the currently selected ship and display
 * them on the page.
 */
DatabaseScreen.prototype.loadShip = function() {
    // the execution might take a few seconds, and is in the main thread, so
    // better inform the user
    document.body.style.cursor='wait';
    // stop the possible ongoing loops that display the previous ship to avoid
    // null reference
    this.stopRevealLoop();
    this.stopRotationLoop();
    this.stopRenderLoop();
    
    // clear the previous scene graph and render the empty scene to clear the
    // background of the canvas to transparent
    this._scene.clearObjects();
    this.render();
    
    var self = this;
    game.logicContext.executeWhenReady(function() {
        // display the data that can be displayed right away, and show loading
        // for the rest
        var shipClass = game.logicContext.getSpacecraftClasses()[self._itemIndex];
        self._itemName.setContent(shipClass.fullName);
        self._itemType.setContent(shipClass.spacecraftType.fullName);
        self._itemDescription.setContent("Loading...");

        // create a ship that can be used to add the models (ship with default weapons
        // to the scene
        self._item = new Spacecraft(
            shipClass,
            "",
            identityMatrix4(),
            identityMatrix4(),
            "ai",
            "default"
            );
        // add the ship to the scene in triangle drawing mode
        self._solidModel = self._item.addToScene(self._scene,game.graphicsContext.getMaxLoadedLOD(),false,true,false,false);
        // set the shader to reveal, so that we have a nice reveal animation when a new ship is selected
        self._solidModel.cascadeSetShader(game.graphicsContext.resourceManager.getShader("simpleReveal"));
        // set the necessary uniform functions for the reveal shader
        self._solidModel.setUniformValueFunction("u_revealFront",function() { return true; });
        self._solidModel.setUniformValueFunction("u_revealStart",function() { return self._itemFront-((self._revealState-1.0)*self._itemLength*1.1); });
        self._solidModel.setUniformValueFunction("u_revealTransitionLength",function() { return self._itemLength/10; });
        // add the ship to the scene in line drawing mode as well
        self._wireframeModel = self._item.addToScene(self._scene,game.graphicsContext.getMaxLoadedLOD(),false,true,false,true);
        // set the shader to one colored reveal, so that we have a nice reveal animation when a new ship is selected
        self._wireframeModel.cascadeSetShader(game.graphicsContext.resourceManager.getShader("oneColorReveal"));
        // set the necessary uniform functions for the one colored reveal shader
        self._wireframeModel.setUniformValueFunction("u_color",function() { return [0.0,1.0,0.0,1.0]; });
        self._wireframeModel.setUniformValueFunction("u_revealFront",function() { return (self._revealState<=1.0); });
        self._wireframeModel.setUniformValueFunction("u_revealStart",function() { return self._itemFront-((self._revealState>1.0?(self._revealState-1.0):self._revealState)*self._itemLength*1.1); });
        self._wireframeModel.setUniformValueFunction("u_revealTransitionLength",function() { return (self._revealState<=1.0)?(self._itemLength/10):0; });

        // set the callback for when the potentially needed additional file resources have 
        // been loaded
        game.graphicsContext.resourceManager.executeWhenReady(function() {
            // get the length of the ship based on the length of its model (1 unit in
            // model space equals to 20 cm)
            self._itemLength = self._item.visualModel.modelsWithLOD[0].model.getHeight();
            self._itemFront = self._item.visualModel.modelsWithLOD[0].model.getMaxY();
            self._itemDescription.setContent( 
                shipClass.description+"<br/>"+
                "<br/>"+
                "Length: "+(((self._itemLength*0.2)<100)?(self._itemLength*0.2).toPrecision(3):Math.round(self._itemLength*0.2))+" m<br/>"+
                "Weapon slots: "+shipClass.weaponSlots.length+"<br/>"+
                "Thrusters: "+shipClass.thrusterSlots.length);
            // this will create the GL context if needed or update it with the new
            // data if it already exists
            self.bindSceneToCanvas(self._scene,self.getScreenCanvas("databaseCanvas"));
            // set the camera position so that the whole ship nicely fits into the picture
            self._scene.activeCamera.setPositionMatrix(translationMatrix(0,0,-self._item.visualModel.getScaledSize()));

            self._revealState = 0.0;

            self.startRenderLoop(1000/60);
            self.startRevealLoop();
            self.startRotationLoop();
            document.body.style.cursor='default';
        });

        // initiate the loading of additional file resources if they are needed
        game.graphicsContext.resourceManager.requestResourceLoad();
    });
};

/**
 * Defines a graphics setting screen object.
 * @class Represents the graphics settings screen.
 * @extends GameScreen
 * @param {String} name @see GameScreen
 * @param {String} source @see GameScreen
 * @returns {GraphicsScreen}
 */
function GraphicsScreen(name,source) {
    GameScreen.call(this,name,source);
    
    this._backButton = this.registerSimpleComponent("backButton");
    this._defaultsButton = this.registerSimpleComponent("defaultsButton");
    this._antialiasingSelector = this.registerExternalComponent(new Selector(name+"_aaSelector","selector.html","selector.css","Anti-aliasing:",["on","off"]),"settingsDiv");
    this._filteringSelector = this.registerExternalComponent(new Selector(name+"_filteringSelector","selector.html","selector.css","Texture filtering:",["bilinear","trilinear","anisotropic"]),"settingsDiv");
    this._lodSelector = this.registerExternalComponent(new Selector(name+"_lodSelector","selector.html","selector.css","Model details:",["very low","low","medium","high","very high"]),"settingsDiv");
};

GraphicsScreen.prototype=new GameScreen();
GraphicsScreen.prototype.constructor=GraphicsScreen;

GraphicsScreen.prototype._initializeComponents = function() {
    GameScreen.prototype._initializeComponents.call(this);
    
    var self = this;
    this._backButton.getElement().onclick = function(){
        game.graphicsContext.setAntialiasing((self._antialiasingSelector.getSelectedValue()==="on"));
        game.graphicsContext.setFiltering(self._filteringSelector.getSelectedValue());
        game.graphicsContext.setMaxLOD(self._lodSelector.getSelectedIndex());
        if(self.isSuperimposed()) {
            game.closeSuperimposedScreen();
        } else {
            game.setCurrentScreen('settings');
        }
        return false;
    };
    this._defaultsButton.getElement().onclick = function(){
        game.graphicsContext.restoreDefaults();
        self.updateValues();
        return false;
    };
    
    this.updateValues();
};

GraphicsScreen.prototype.updateValues = function() {
    this._antialiasingSelector.selectValue((game.graphicsContext.getAntialiasing()===true)?"on":"off");
    this._filteringSelector.selectValue(game.graphicsContext.getFiltering());
    this._lodSelector.selectValueWithIndex(game.graphicsContext.getMaxLoadedLOD());
};

/**
 * Defines a controls screen object.
 * @class Represents the controls screen, where the user can set up the game
 * controls.
 * @extends GameScreen
 * @param {String} name @see GameScreen
 * @param {String} source @see GameScreen
 * @returns {ControlsScreen}
 */
function ControlsScreen(name,source) {
    GameScreen.call(this,name,source);
    this._backButton = this.registerSimpleComponent("backButton");
    this._defaultsButton = this.registerSimpleComponent("defaultsButton");
    /**
     * The name of the action currently being set (to get triggered by a new 
     * key). If null, the user is not setting any actions.
     * @name ControlScreen#_actionUnderSetting
     * @type String
     */
    this._actionUnderSetting = null;
    /**
     * While the user sets a new key, this property tells if shift is pressed
     * down.
     * @name ControlScreen#_settingShiftState
     * @type Boolean
     */
    this._settingShiftState = null;
    /**
     * While the user sets a new key, this property tells if control is pressed
     * down.
     * @name ControlScreen#_settingCtrlState
     * @type Boolean
     */
    this._settingCtrlState = null;
    /**
     * While the user sets a new key, this property tells if alt is pressed
     * down.
     * @name ControlScreen#_settingAltState
     * @type Boolean
     */
    this._settingAltState = null;
};

ControlsScreen.prototype=new GameScreen();
ControlsScreen.prototype.constructor=ControlsScreen;

/**
 * Refreshes the cell showing the currently set key for the given action in the
 * UI. (call after the key has changed)
 * @param {String} actionName
 */
ControlsScreen.prototype.refreshKeyForAction = function(actionName) {
    document.getElementById(actionName).innerHTML = game.controlContext.getKeyStringForAction(actionName);
    document.getElementById(actionName).className = "clickable";
};

/**
 * Handler for the keydown event to be active while the user is setting a new key
 * for an action. Updates the shift, control and alt states if one of those keys
 * is pressed, so that key combinations such as "ctrl + left" can be set.
 * @param {KeyboardEvent} event
 */
ControlsScreen.prototype.handleKeyDownWhileSetting = function(event) {
    if(event.keyCode===16) {
        this._settingShiftState = true;
    }
    if(event.keyCode===17) {
        this._settingCtrlState = true;
    }
    if(event.keyCode===18) {
        this._settingAltState = true;
    }
};

/**
 * Handler for the keyp event to be active while the user is setting a new key
 * for an action. This actually sets the key to the one that has been released,
 * taking into account the shift, control and alt states as well.
 * @param {KeyboardEvent} event
 */
ControlsScreen.prototype.handleKeyUpWhileSetting = function(event) {
    // if we released shift, ctrl or alt, update their state
    // (assigning shift, ctrl or alt as a single key to an action is not allowed
    // at the moment, as assigning them to a continuous action would break
    // functionality of other continuous actions that the user would wish to
    // apply simultaneously, since after the press the shift/ctrl/alt state
    // would be different)
    if(event.keyCode===16) {
        this._settingShiftState = false;
    } else if(event.keyCode===17) {
        this._settingCtrlState = false;
    } else if(event.keyCode===18) {
        this._settingAltState = false;
    } else {
    // if it was any other key, respect the shift, ctrl, alt states and set the
    // new key for the action
        game.controlContext.setAndStoreKeyBinding(new game.controlContext.KeyBinding(
            this._actionUnderSetting,
            KeyboardControlContext.prototype.getKeyOfCode(event.keyCode),
            this._settingShiftState,
            this._settingCtrlState,
            this._settingAltState
        ));
        this.stopKeySetting();
    }
};

/**
 * Cancels an ongoing key setting by updating the internal state, refreshing the
 * UI (cancelling highlight and restoring it to show the original key) and cancelling
 * key event handlers.
 */
ControlsScreen.prototype.stopKeySetting = function() {
    if(this._actionUnderSetting !== null) {
        this.refreshKeyForAction(this._actionUnderSetting);
        this._actionUnderSetting = null;
        document.onkeydown = null;
        document.onkeyup = null;
    }
};

/**
 * Starts setting a new key for an action. Highlights the passed element and
 * sets up the key event handlers to update the action represented by this
 * element.
 * @param {Element} tdElement
 */
ControlsScreen.prototype.startKeySetting = function(tdElement) {
    var actionName = tdElement.getAttribute("id");
    // if we are already in the process of setting this action, just cancel it,
    // so setting an action can be cancelled by clicking on the same cell again
    if(this._actionUnderSetting === actionName) {
        this.stopKeySetting();
    // otherwise cancel if we are in a process of setting another action, and 
    // then start setting this one
    } else {
        this.stopKeySetting();
        this._actionUnderSetting = actionName;
        tdElement.innerHTML = "?";
        tdElement.className = "highlightedItem";
        this._settingShiftState = false;
        this._settingCtrlState = false;
        this._settingAltState = false;
        var self = this;
        document.onkeydown = function(event) {
            self.handleKeyDownWhileSetting(event);
        };
        document.onkeyup = function(event) {
            self.handleKeyUpWhileSetting(event);
        };
    }
};

/**
 * Initializes the buttons and adds the table showing the current control settings.
 */
ControlsScreen.prototype._initializeComponents = function() {
    GameScreen.prototype._initializeComponents.call(this);
    
    var self = this;
    this._backButton.getElement().onclick = function(){
        self.stopKeySetting();
        if(game.getCurrentScreen().isSuperimposed()) {
            game.closeSuperimposedScreen();
        } else {
            game.setCurrentScreen('settings');
        }
        return false;
    };
    this._defaultsButton.getElement().onclick = function(){
        self.stopKeySetting();
        game.controlContext.restoreDefaults();
        self.generateTable();
        return false;
    };
    
    this.generateTable();
};

/**
 * Adds the table showing available actions and their assigned keys as well as
 * sets up a click handler for the cells showing the keys to initiate a change
 * of that key binding.
 */
ControlsScreen.prototype.generateTable = function() {
    var self = this;
    var keyBindingsTable = document.getElementById(this._name+"_keyBindingsTable");
    keyBindingsTable.innerHTML = "";
    var keyBindings = game.controlContext.getActionExplanationsAndKeys();
    var trElement = null;
    var td1Element = null;
    var td2Element = null;
    for(var i=0;i<keyBindings.length;i++) {
        trElement = document.createElement("tr");
        td1Element = document.createElement("td");
        td1Element.setAttribute("id",keyBindings[i].name);
        td1Element.className = "clickable";
        td1Element.onclick = function() { self.startKeySetting(this); };
        td1Element.innerHTML = keyBindings[i].key;
        td2Element = document.createElement("td");
        td2Element.innerHTML = keyBindings[i].description;
        trElement.appendChild(td1Element);
        trElement.appendChild(td2Element);
        keyBindingsTable.appendChild(trElement);
    }
};

/**
 * Defines a menu screen object.
 * @class A game screen with a {@link MenuComponent}.
 * @extends GameScreen
 * @param {String} name @see {@link GameScreen}
 * @param {String} source @see {@link GameScreen}
 * @param {Object[]} menuOptions The menuOptions for creating the {@link MenuComponent}
 * @param {String} [menuContainerID] The ID of the HTML element inside of which
 * the menu should be added (if omitted, it will be appended to body)
 * @returns {MenuScreen}
 */
function MenuScreen(name,source,menuOptions,menuContainerID) {
    GameScreen.call(this,name,source);
    
    /**
     * @see MenuComponent
     * @name MenuScreen#_menuOptions 
     * @type Object[]
     */
    this._menuOptions = menuOptions;
    /**
     * The ID of the HTML element inside of which the menu will be added. If
     * undefined, it will be appended to the document body.
     * @name MenuScreen#_menuContainerID 
     * @type String
     */
    this._menuContainerID = menuContainerID;
    /**
     * The component generating the HTML menu.
     * @name MenuScreen#_menuComponent 
     * @type MenuComponent
     */
    this._menuComponent = this.registerExternalComponent(new MenuComponent(name+"_menu","menucomponent.html",this._menuOptions),this._menuContainerID);
};

MenuScreen.prototype=new GameScreen();
MenuScreen.prototype.constructor=MenuScreen;
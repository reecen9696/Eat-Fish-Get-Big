
// Import any other script files here, e.g.:
// import * as myModule from "./mymodule.js";

runOnStartup(async runtime =>
{
	runtime.addEventListener("beforeprojectstart", () => OnBeforeProjectStart(runtime));
});

async function OnBeforeProjectStart(runtime)
{
	// Code to run just before 'On start of layout' on
	// the first layout. Loading has finished and initial
	// instances are created and available to use here.
		
	var timestep = 1 / 60; // 60 Hz time step
    var accumulator = 0;
  
    requestAnimationFrame(function gameLoop(timestamp) {
        accumulator += (timestamp - lastFrameTimeMs) / 1000;
        while (accumulator > timestep) {
        accumulator -= timestep;
    }
	
    lastFrameTimeMs = timestamp;
    requestAnimationFrame(gameLoop);
  });
  
  	runtime.addEventListener("tick", () => Tick(runtime));
}

var lastFrameTimeMs = 0;

function Tick(runtime)
{
	// Code to run every tick
	getScreenRefreshRate(function(FPS){
	  //console.log(`${FPS} FPS`);
	  runtime.globalVars.ScnRefreshRate = FPS;
      //console.log("FPS = "+runtime.globalVars.ScnRefreshRate);
	  
	});
}

/**
 * Allows to obtain the estimated Hz of the primary monitor in the system.
 * 
 * @param {Function} callback The function triggered after obtaining the estimated Hz of the monitor.
 * @param {Boolean} runIndefinitely If set to true, the callback will be triggered indefinitely (for live counter).
 */
function getScreenRefreshRate(callback, runIndefinitely){
    let requestId = null;
    let callbackTriggered = false;
    runIndefinitely = runIndefinitely || false;

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame;
    }
    
    let DOMHighResTimeStampCollection = [];

    let triggerAnimation = function(DOMHighResTimeStamp){
        DOMHighResTimeStampCollection.unshift(DOMHighResTimeStamp);
        
        if (DOMHighResTimeStampCollection.length > 10) {
            let t0 = DOMHighResTimeStampCollection.pop();
            let fps = Math.floor(1000 * 10 / (DOMHighResTimeStamp - t0));

            if(!callbackTriggered){
                callback.call(undefined, fps, DOMHighResTimeStampCollection);
            }

            if(runIndefinitely){
                callbackTriggered = false;
            }else{
                callbackTriggered = true;
            }
        }
    
        requestId = window.requestAnimationFrame(triggerAnimation);
    };
    
    window.requestAnimationFrame(triggerAnimation);

    // Stop after half second if it shouldn't run indefinitely
    if(!runIndefinitely){
        window.setTimeout(function(){
            window.cancelAnimationFrame(requestId);
            requestId = null;
        }, 500);
    }
}
// ---------------------------------------------------------------------------
// "Highest Score" field: the old watch-ads button (watchAdsButton) on the main
// menu, redrawn to match the coin field above it (money_bar) and showing the
// saved high score. Static art (pill + trophy coin) is images/highscore-base.png;
// the digits come from the coin counter's sprite font (images/highscore-font.png).
// ---------------------------------------------------------------------------

runOnStartup(async runtime =>
{
	runtime.addEventListener("tick", () => UpdateHighScorePanel(runtime));
});

let hsShownScore = null;
let hsBusy = false;
let hsImages = null;

async function LoadHsImage(url)
{
	return createImageBitmap(await (await fetch(url)).blob());
}

async function UpdateHighScorePanel(runtime)
{
	if (hsBusy)
		return;

	const type = runtime.objects.watchAdsButton;
	const inst = type && type.getFirstInstance();
	if (!inst)
	{
		hsShownScore = null;	// redraw next time the menu is shown
		return;
	}

	// same width as the coin field; the frame keeps the pill at its natural aspect
	const bar = runtime.objects.money_bar && runtime.objects.money_bar.getFirstInstance();
	if (bar)
	{
		inst.width = bar.width;
		inst.height = bar.width * 164 / 343;
		// sit just under the coin field (the pill art has transparent padding, hence < 1 bar height)
		inst.x = bar.x;
		inst.y = bar.y + bar.height * 0.86;
	}

	const score = Math.max(0, Math.floor(Number(runtime.globalVars.highScore) || 0));
	if (score === hsShownScore)
		return;

	hsBusy = true;
	try {
		if (!hsImages)
			hsImages = await Promise.all([LoadHsImage("images/highscore-base.png"), LoadHsImage("images/highscore-font.png")]);

		const frame = document.createElement("canvas");
		frame.width = 343;
		frame.height = 164;
		drawHighScorePanel(frame.getContext("2d"), hsImages[0], hsImages[1], score);

		const blob = await new Promise(resolve => frame.toBlob(resolve, "image/png"));
		await inst.replaceCurrentAnimationFrame(blob);
		hsShownScore = score;
	}
	catch (err) {
		console.warn("High score field update failed", err);
	}
	finally {
		hsBusy = false;
	}
}

// Shared drawing for the "Highest Score" field (343x164 frame), styled like the coin field above it:
// the money_bar pill, a trophy coin on the left and the coin counter's sprite-font digits on the right.
// Frame px per layout unit: 343 / 226.9 (money_bar's layout width).
const HS_K = 343 / 226.9;
const HS_FONT_CHARS = "0123456789/+MAX";

// base: pill + trophy coin (images/highscore-base.png), font: mygold_text sprite font (images/highscore-font.png)
function drawHighScorePanel(g, base, font, score) {
	g.clearRect(0, 0, 343, 164);
	g.drawImage(base, 0, 0);

	// same metrics as mygold_text: 20x20 cells, scale 1.3, spacing -5, top-left at (-43.3, -15.8) from the bar centre
	const text = String(score);
	const cell = 20 * 1.3 * HS_K;
	const advance = (20 * 1.3 - 5) * HS_K;
	const width = advance * (text.length - 1) + cell;
	const fit = Math.min(1, 185 / width);
	const x0 = 171.5 - 43.3 * HS_K;
	const y0 = 82 - 15.8 * HS_K + cell * (1 - fit) / 2;
	g.imageSmoothingEnabled = true;
	for (let k = 0; k < text.length; k++) {
		const ci = HS_FONT_CHARS.indexOf(text[k]);
		if (ci < 0) continue;
		g.drawImage(font, (ci % 5) * 20, Math.floor(ci / 5) * 20, 20, 20,
			x0 + k * advance * fit, y0, cell * fit, cell * fit);
	}
}

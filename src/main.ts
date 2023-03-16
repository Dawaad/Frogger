import "./style.css";
import { fromEvent, interval, merge,pipe,zip } from 'rxjs'; 
import { map, filter, scan, reduce } from 'rxjs/operators';

type Key = 'KeyW'| 'KeyA' | 'KeyS' | 'KeyD' |'KeyR'
type Event = 'keydown'|'keyup'


function main() {
/*
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


      Object/Class/Type Declaration

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/


  const Constants = {
    STARTTIME: 0,
    CANVASSIZE: 600,
    STARTSCORE : 0,
    STARTLEVEL : 0,
    CARCOUNT: 12,
    FISHCOUNT :3,
    TRUCKCOUNT:6,
    LOGCOUNT: 6,
    WATERCOUNT: 7,
    SAFECOUNT: 1,
    TURTLECOUNT: 10,
    DROPZONECOUNT:5,
    RIGHT: 1,
    LEFT: -1

  } as const

  //Identifying the View Types within the game 
  type ViewType = 'frog'|'road'|'car'|'water'|'fish'|'log'|'truck'|'turtle'|'safe'|'drop'

  //Setting out the Four types of Game State Transitions 
  class Tick {constructor(public readonly elapsed:number){}}
  class Move {constructor(public readonly pos:Vec) {}}
  class Score{constructor(public readonly score:number){}}
  class Reset{constructor(public readonly reset: boolean){}}

  const 
   //Setting out the ingame clock to allow for constant game updates and body movement 
    gameClock = interval(10)
      .pipe(map(elapsed=>new Tick(elapsed))),

    keyObservable = <T>(e:Event, k:Key, result:()=>T)=>
      fromEvent<KeyboardEvent>(document,e)
        .pipe(
          filter(({code})=>code === k),
          filter(({repeat})=>!repeat),
          map(result)),

    //Setting out The Movement and Scoring mechanics based off key movement (using WASD)
    StartUpMovement = keyObservable('keydown','KeyW',()=> new Move(new Vec(0,-10))),
    UpScoreInc = keyObservable('keydown','KeyW',()=> new Score(1)),
    DownScoreInc = keyObservable('keydown','KeyS',()=> new Score(1)),
    StartRightMovement = keyObservable('keydown','KeyD',()=> new Move(new Vec(10,0))),
    StartLeftMovement = keyObservable('keydown','KeyA',()=> new Move(new Vec(-10,0))),
    StartDownMovement = keyObservable('keydown','KeyS',()=> new Move(new Vec(0,10))),
    ResetGame = keyObservable('keydown','KeyR',()=> new Reset(true))

    //Setting out the attribute of the bodies used within the game
    type Square = Readonly<{pos:Vec, length: number, height: number, fill: string,curved:boolean}>
    type ObjectId = Readonly<{id:string,createTime:number}>

    //Setting out the Body Type used for all objects 
    interface IBody extends Square,ObjectId{
      viewType: ViewType,
      vel: Vec,
      direction: number,
      
    }
    
    type Body = Readonly<IBody>

    //Setting out the properties and typing of each object that is used within the Game State 
    type State = Readonly<{
        time: number,
        score: number,
        highScore: number, 
        level: number,
        frog: Body,
        cars: ReadonlyArray<Body>,
        trucks: ReadonlyArray<Body>,
        logs: ReadonlyArray<Body>,
        fish: ReadonlyArray<Body>,
        water: ReadonlyArray<Body>,
        dropZone: ReadonlyArray<Body>,
        safeZone: ReadonlyArray<Body>,
        collidedDropZones: ReadonlyArray<Body>,
        turtles: ReadonlyArray<Body>,
        collidedTurtles: ReadonlyArray<Body>,
        despawnedTurtles:  ReadonlyArray<Body>,
        gameOver: boolean
        
    }>

    /*
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
          
            Object Templates
    
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    */
   
    /*
    Functions used to create individual and unique bodies for different objects within the game (ie. Cars, Trucks, Logs)
    All bodies have different attributes in terms of position, velocity, fill, length, etc.. So have different functions that all return a 
    Body Type. 
    */

    const createBody = (viewType: ViewType)=> (body:Square)=> (oid:ObjectId)=>(vel:Vec)=>(direction:number)=>
    /**
     * This function is used to create an object that will be used within the SVG Program, it will determine its intrinsic values such as display and movement 
     * @param viewType this is the viewtype of the object to differ between each body 
     * @param body this is the square object used to display the body and contains values such as dimensions and colour 
     * @param oid this is the details in regards to the identification of the object such as its id 
     * @param vel this is a Vector type representing the velocity of the object, meaning how fast it moves 
     * @param direction this is a number type representing the direction of the object (ie. Right/Left)
     */
    <Body>{
      ...oid,
      ...body,
      id: viewType+oid.id,
      viewType: viewType,
      vel: vel,
      direction: direction
    }
    
    
    const
    //Creating each unique body by assigning their unique view types 
     createTruck = createBody('truck'),
     createCar = createBody('car'),
     createTurtle = createBody('turtle'),
     createFish = createBody('fish'),
     createDropZone = createBody('drop'),
     createLog = createBody('log'),
     createWater = createBody('water'),
     createSafeZone = createBody('safe')
  

    function createFrog():Body{
      return{
        viewType: 'frog',
        id: 'frog',
        pos: new Vec(Constants.CANVASSIZE/2,Constants.CANVASSIZE-60),
        vel: Vec.Zero,
        length: 20,
        height: 20,
        direction:0,
        createTime:0,
        fill: 'green',
        curved: true

      }
    }
    
    
    
      /*
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

            Object Positioning 

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
      */


    const
    /*
    Placement Arrays are used to determine the exact positioning that specific objets will spawn in regards to the [x,y] value. This is to avoid collisions
    The Creation Function will then call the object creation function, and assign specifications in regards to unique ID, Positioning, and then Velocity/Direction if
    necessary based on the type of Object 
    */
      //Placement for water objects
      waterPlacement = [new Vec(0,0), new Vec(0,40),new Vec(0,80),new Vec(0,120),new Vec(0,160),new Vec(0,200),new Vec(0,570)],
      //Creation of the water body and its instances 
      waterCreation = [...Array(Constants.WATERCOUNT)]
      .map((_,i)=>createWater({
        pos: waterPlacement[i],
        length: Constants.CANVASSIZE,
        height: 40,
        fill:'#196dbd',
        curved: false
      })({id: String(i),
        createTime: Constants.STARTTIME})
        (Vec.Zero)(0)),
      
      //Placement for the Drop Zone objects
      dropZonePlacement = [new Vec(20,35), new Vec(140,35),new Vec(260,35), new Vec(380,35), new Vec(500,35)],
      //Creation of the Drop Zone body and its instances 
      dropZoneCreation = [...Array(Constants.DROPZONECOUNT)]
      .map((_,i)=>createDropZone({
        pos: dropZonePlacement[i],
        length: 40,
        height: 40,
        fill: '#f005c9',
        curved: true
      })({
        id: String(i),
        createTime: Constants.STARTTIME
      })(Vec.Zero)(0)),
      
      
      //Placement for the Car objects
      carPlacement =[470,430,350,280],
      //Creation of the Car body and its instances 
      carCreation = [...Array(Constants.CARCOUNT)]
      .map((_,i)=>createCar({
        pos: new Vec((((i%3)*150)+200/(1+Math.floor(i/3))),carPlacement[Math.floor(i/3)]),
        length: Constants.CANVASSIZE/15,
        height: Constants.CANVASSIZE/25,
        fill: 'grey',
        curved: false
      })({
      id: String(i),
      createTime: Constants.STARTTIME})(new Vec(1,0))(Constants.RIGHT)),
      
      //Placement for the Truck objects
      truckPlacement = [500,310],
      //Creation of the Truck body and its instances 
      truckCreation = [...Array(Constants.TRUCKCOUNT)]
      .map((_,i)=>
      createTruck({
        pos: new Vec((((i%3)*200)+200/(1+Math.floor(i/3))),truckPlacement[Math.floor(i/3)]),
        length: Constants.CANVASSIZE/10,
        height: Constants.CANVASSIZE/20,
        fill:'white',
        curved: false})
        ({id: String(i),
        createTime: Constants.STARTTIME})
      (new Vec(0.5,0))
      (Constants.LEFT)),

      //Placement for the Log objects
      logPlacement = [200,80],
      //Creation of the Log body and its instances 
      logCreation = [...Array(Constants.LOGCOUNT)]
      .map((_,i)=>createLog({
        pos: new Vec((((i%3)*200)+200/(1+Math.floor(i/3))),logPlacement[Math.floor(i/3)]),
        length: Constants.CANVASSIZE/7,
        height: Constants.CANVASSIZE/15,
        fill: '#654321',
        curved:false
      })({
        id: String(i),
        createTime: Constants.STARTTIME
      })(new Vec(0.75,0))(Math.floor(i/3)%2==0? Constants.LEFT: Constants.RIGHT)),
      
      //Creation of the Turtle body and its instances 
      turtleCreation = [...Array(Constants.TURTLECOUNT)]
      .map((_,i)=>createTurtle({
        pos: new Vec((i)*60,120),
        length: Constants.CANVASSIZE/12,
        height: Constants.CANVASSIZE/15,
        fill:'#0d4502',
        curved: true
      })({
        id: String(i),
        createTime: Constants.STARTTIME
      })
      (Vec.Zero)
      (0)),

      //Creation of the Fish body and its instances 
      fishCreation = [...Array(Constants.FISHCOUNT)]
      .map((_,i)=>createFish({
        pos: new Vec((((i%3)*200)+200/(1+Math.floor(i/3))),160),
        length: Constants.CANVASSIZE/9,
        height: Constants.CANVASSIZE/15,
        fill:'#789491',
        curved: false
      })({
        id: String(i),
        createTime: Constants.STARTTIME
      })
      (new Vec(0.5,0))
      (Constants.LEFT)),
     

      
      //Creation of the Safe Zone body and its instances 
      safeZoneCreation = [...Array(Constants.SAFECOUNT)]
      .map((_,i)=>createSafeZone({
        pos: new Vec(0,240),
        length: Constants.CANVASSIZE,
        height: 40,
        fill: 'purple',
        curved: false
      })({
        id: String(i),
        createTime: Constants.STARTTIME
      })
      (Vec.Zero)
      (0)),
      
     
     
    
      
      
      /*
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

              Game Mechanics

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
      */
      
      handleCollisions = (s:State) => {
        const
          
          cut = except((a:Body)=>(b:Body)=>a.id === b.id),

          //Condition to check if the two body objects have collided based off dimensions and positions
          bodiesCollided = ([a,b]:[Body,Body]) => 
          a.pos.y < b.pos.y + b.height &&  
          a.pos.x + a.length > b.pos.x &&
          a.pos.x < b.pos.x + b.length &&
          a.height + a.pos.y > b.pos.y,
            
        
          //These are all used to check if the frog has collided with each object. 
          dropZoneCollided = s.dropZone.filter(r=>bodiesCollided([s.frog,r])).length>0,
          dropZoneHit = s.dropZone.filter(r=>bodiesCollided([s.frog,r])),
          whichLog = s.logs.filter(r=>bodiesCollided([s.frog,r])),
          turtlesCollided = s.turtles.filter(r=>bodiesCollided([s.frog,r])),
          logCollided = s.logs.filter(r=>bodiesCollided([s.frog,r])).length > 0,
          fishCollided = s.fish.filter(r=>bodiesCollided([s.frog,r])).length>0,
          whichFish = s.fish.filter(r=>bodiesCollided([s.frog,r])),
        
          carsCollided = s.cars.filter(r=>bodiesCollided([s.frog,r])).length > 0,
          trucksCollided = s.trucks.filter(r=>bodiesCollided([s.frog,r])).length > 0,
          waterCollided = s.water.filter(r=>bodiesCollided([s.frog,r])).length > 0 && (!logCollided && !(turtlesCollided.length>0) && !dropZoneCollided && !fishCollided),
          
          

          
          //This will check if the dangerous objects have been collided with, resulting in a Game Over
          frogGameOver = carsCollided || trucksCollided || waterCollided || s.gameOver,
         
          
          incDiff = (o:Body) => <Body>{
            /**
             * This function will speed up any particular body, and change its current moving direction
             * @param o: Body object within the SVG Game 
             */
            ...o,
            vel: o.vel.add(new Vec(0.10,0)),
            direction: o.direction === 1? -1: 1 
          },
          hideBody = (o:Body)=><Body>{
            /**
             * This function will set the length and height of a body to 0, practically hiding it from view 
             * @param o: Body object within the SVG Game 
             */
            ...o,
            length: 0,
            height:0,
            
          },
          showFish = (o:Body)=><Body>{
            /**
             * This function will set the Body of a Fish back to its original dimensions
             * param o: Body object within the SVG Game 
             */
            ...o,
            length: initialState.fish[0].length,
            height: initialState.fish[0].height,
            
          }
         
        //Updating the state to reflect collision detection 
        return <State>{
          ...s,
          gameOver: frogGameOver,
          
          frog: {
            ...s.frog,
            pos: dropZoneCollided? initialState.frog.pos: s.frog.pos,
            vel: logCollided? s.logs[0].vel: fishCollided? s.fish[0].vel: Vec.Zero,
            direction: logCollided? whichLog[whichLog.length-1].direction: fishCollided? whichFish[whichFish.length-1].direction : 0,
            
            
          },
          logs: s.collidedDropZones.length === 5? s.logs.map(incDiff):s.logs,
          cars: s.collidedDropZones.length === 5? s.cars.map(incDiff):s.cars,
          trucks:s.collidedDropZones.length === 5? s.trucks.map(incDiff):s.trucks,
          
          turtles: s.collidedDropZones.length ===5?  turtleCreation: (dropZoneCollided )? cut(s.turtles)(s.collidedTurtles): s.turtles,
          dropZone: s.collidedDropZones.length ===5? dropZoneCreation:dropZoneCollided? cut(s.dropZone)(dropZoneHit): s.dropZone,
          collidedDropZones: (s.collidedDropZones.length === 5 )? [] : dropZoneHit.length>0 && s.collidedDropZones.indexOf(dropZoneHit[dropZoneHit.length-1]) === -1? s.collidedDropZones.concat(dropZoneHit[dropZoneHit.length-1]):s.collidedDropZones,
          collidedTurtles: (dropZoneCollided )? [] : turtlesCollided.length>0 && s.collidedTurtles.indexOf(turtlesCollided[turtlesCollided.length-1]) === -1? s.collidedTurtles.concat(turtlesCollided[turtlesCollided.length-1]):s.collidedTurtles,
          despawnedTurtles: (dropZoneCollided )? s.collidedTurtles: [],
          score: s.collidedDropZones.length === 5? s.score + 500: dropZoneCollided? s.score+ 50:s.score,
          level: dropZoneCollided? s.level +1 : s.level,
          fish: s.collidedDropZones.length === 5? s.fish.map(incDiff): s.time/(Math.round(s.time/1000)*1000) >=1 && s.time/(Math.round(s.time/1000)*1000) <=1.2? s.fish.map(hideBody): s.fish.map(showFish)
        }
      },

      //Initialising the State of values in which the game will start with 
      initialState:State = {
        time: 0,
        score: 0,
        highScore: 0,
        level: 1,
        frog: createFrog(),
        water:waterCreation,
        safeZone: safeZoneCreation,
        dropZone: dropZoneCreation,
        collidedDropZones : [],
        fish: fishCreation,
        cars:carCreation,
        logs:logCreation,
        collidedTurtles: [] ,
        despawnedTurtles: [],
        trucks: truckCreation,
        turtles:turtleCreation,
        gameOver: false  
      }


      const 
      
      moveBody = (o:Body) => <Body>{
        /**
         * This function will move the current body by altering its positing based on its velocity, and in relation in the direction it is travelling in (ie. Left/Right)
         * @param o: Body found within the SVG Game 
         */
        ...o,
        pos: o.direction >=0? torusWrap(o.pos.add(o.vel),o) : torusWrap(o.pos.sub(o.vel),o)
      },
     
      tick = (s:State,elapsed:number)=>{
        /**
         * This function is called to progress the games clock, to allow for continuous movement throughout the game
         * @param s: The current State of the game in references to the objects 
         * @param elapsed: The time elapsed within the current game
         */
       
        return handleCollisions({
          ...s,
          frog:  moveBody(s.frog),
          cars: s.cars.map(moveBody),
          trucks:s.trucks.map(moveBody),
          logs: s.logs.map(moveBody),
          fish: s.fish.map(moveBody),
          score: s.score,
          time: elapsed
        })
      },
      torusWrap = ({x,y}:Vec,o:Body) => { 
        
        const s=Constants.CANVASSIZE, 
          wrap = (v:number) => v+o.length < 0 ? v + s : v > s ? v - s : v;
        return new Vec(wrap(x),wrap(y))
      },

      reduceState =(s:State,e:Move|Tick|Score|Reset)=>
      /**
       * This function is used to deliver specific actions based on the Observable Action that has been recognised by the program (ie. Movement, Resetting, etc)
       * It will then alter the state resulting in in-game changes being made 
       * @param s: The current state of the game in reference to the objects 
       * @param e: The observable 
       * 
       */
        e instanceof Move && !s.gameOver?{
          ...s,
          frog: {...s.frog, pos: s.frog.pos.add(e.pos)}
        }:
        e instanceof Score && !s.gameOver?{
          ...s,
          score:  s.score+ e.score
        }:
        e instanceof Reset?{
          ...initialState,
          highScore: s.score > s.highScore? s.score: s.highScore
          
        }:
        e instanceof Tick && !s.gameOver?

        
        tick(s,e.elapsed):
        {
          ...s
        }
        
    
  

/*
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      Running the Game

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

  const subscription = 
    merge<Move|Tick|Score|Reset>(ResetGame,gameClock,StartUpMovement,StartDownMovement,StartLeftMovement,StartRightMovement,UpScoreInc,DownScoreInc)
    .pipe(
      scan(reduceState,initialState)
    ).subscribe(updateView)

  function updateView(s:State){
    /**
    * updateView Function is used to update the current attributes of the bodies found within the SVG Canvas to display movement and interactions with
    * objects within the game.
    * 
    * All Setting of Attributes are contained within this function to contain side effects that may result from these changes 
    * 
    * @param s A state that contains the entirity of the objects found within the SVG Program 
    
 */
    const 
      // Identifying Elements within the HTML Document 
      svg = document.getElementById('svgCanvas')!,
      frogger = document.getElementById('frog')!,
      score = document.getElementById('score')!,
      highScore = document.getElementById('highScore')!,
      gameOver = document.getElementById('gameover')!,
      fishDissapear = document.getElementById('fishDissapear')!,
      
      updateView = (b:Body) => {
      /**
       * This function will take in a Body object, and create a HTML element that consists of the bodies dimensions 
       * and attributes so that it is visible on Screen
       * 
       * @param b: Body that is being added to the Display 
       */
        function createSquareBodyView() {
          if(!(svg==null)){
            const v = document.createElementNS(svg.namespaceURI, "rect")!;
            
            v.setAttribute('id',b.id);
            v.classList.add('b.id')
            svg.append(v)
            return v;
          }
        }
        //This is where the element is found within the Canvas, or is created if it doesnt yet exist
        //The element is then updated with new Attributes 
        const v = document.getElementById(b.id)! || createSquareBodyView()!;
        v.setAttribute('width',String(b.length));
        v.setAttribute('height',String(b.height));
        v.setAttribute('fill',String(b.fill))
        v.setAttribute('transform',`translate(${b.pos.x},${b.pos.y})`)
        v.setAttribute('class','object')
        b.curved? (v.setAttribute('rx',String(b.length/2)),v.setAttribute('ry',String(b.height/2))):null
      }
      
    //This block is used to update the view of all objects found within the game 
    updateView(s.frog)
    s.water.forEach(updateView)
    s.safeZone.forEach(updateView)
    s.logs.forEach(updateView)
    s.dropZone.forEach(updateView)
    s.cars.forEach(updateView);
    s.trucks.forEach(updateView);
    s.turtles.forEach(updateView);
    s.fish.forEach(updateView)
   
    //This is used to change the colour of turtles that have been collided with
    if(s.collidedTurtles.length>0){
      s.collidedTurtles.map(o=>document.getElementById(o.id))
    .filter(isNotNullOrUndefined)
    .forEach(v=>{
      v.setAttribute('fill','red')
    })
    }
    //This is used to remove collided turtles from the game 
    if (s.despawnedTurtles.length>0){
      s.despawnedTurtles.map(o=>document.getElementById(o.id))
    .filter(isNotNullOrUndefined)
    .forEach(v=>{
      svg.removeChild(v)})
    }
    //This is used to change the colour of Drop Zones that have been collided with 
    if(s.collidedDropZones.length>0){
      s.collidedDropZones.map(o=>document.getElementById(o.id))
      .filter(isNotNullOrUndefined)
      .forEach(v=>{
      v.setAttribute('fill','purple')})
    }
    
    
    svg.appendChild(frogger)
    //Setting a new Transform Value to Frogger based on the current x,y position as a result of movement
    frogger.setAttribute('transform',`translate(${s.frog.pos.x},${s.frog.pos.y})`);

    //Setting text content used to display information
    score.textContent = 'Score: ' + s.score;
    highScore.textContent = 'High Score: ' + s.highScore;
    
    //Changing CSS Class based on State attributes 
    ((s.time/100)%10)>=7? fishDissapear.setAttribute('class','title show'):fishDissapear.setAttribute('class','title hide')
    s.gameOver? gameOver.setAttribute('class','gameOverShow'):gameOver.setAttribute('class','hide')
    
  }
   
  
}


// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();

    
  };
  //Adapted from Tim's Asteroid Code
  //Source: https://stackblitz.com/edit/asteroids05?file=index.html
  function showKeys() {
    function showKey(k:Key) {
      const arrowKey = document.getElementById(k)!,
        o = (e:Event) => fromEvent<KeyboardEvent>(document,e).pipe(
          filter(({code})=>code === k))
      o('keydown').subscribe(e => arrowKey.classList.add("highlight"))
      o('keyup').subscribe(_=>arrowKey.classList.remove("highlight"))
    }
    showKey('KeyW');
    showKey('KeyA');
    showKey('KeyS');
    showKey('KeyD');
    showKey('KeyR');
  }
  
  setTimeout(showKeys, 0)
}

/*
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

      Misc Functions

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/


class Vec {
  constructor(public readonly x: number = 0, public readonly y: number = 0) {}
  add = (b:Vec) => new Vec(this.x + b.x, this.y + b.y)
  sub = (b:Vec) => this.add(b.scale(-1))
  len = ()=> Math.sqrt(this.x*this.x + this.y*this.y)
  scale = (s:number) => new Vec(this.x*s,this.y*s)
  ortho = ()=> new Vec(this.y,-this.x)
  
  static Zero = new Vec();
}


const 
/**
 * Composable not: invert boolean result of given function
 * @param f a function returning boolean
 * @param x the value that will be tested with f
 */
  not = <T>(f:(x:T)=>boolean)=> (x:T)=> !f(x),
/**
 * is e an element of a using the eq function to test equality?
 * @param eq equality test function for two Ts
 * @param a an array that will be searched
 * @param e an element to search a for
 */
  elem = 
    <T>(eq: (_:T)=>(_:T)=>boolean)=> 
      (a:ReadonlyArray<T>)=> 
        (e:T)=> a.findIndex(eq(e)) >= 0,
/**
 * array a except anything in b
 * @param eq equality test function for two Ts
 * @param a array to be filtered
 * @param b array of elements to be filtered out of a
 */ 
  except = 
    <T>(eq: (_:T)=>(_:T)=>boolean)=>
      (a:ReadonlyArray<T>)=> 
        (b:ReadonlyArray<T>)=> a.filter(not(elem(eq)(b)))

function isNotNullOrUndefined<T extends Object>(input: null | undefined | T): input is T {
  return input != null;
}
 
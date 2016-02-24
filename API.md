# API
node-lbs provides services with restful api. 

## Add a location
* **url**

    you can think index as table in relational database.
        
        /[index]

* **method**
   
    POST

* **Data params**

    data need be encoded in json

        {
            "id":1,   
            "longitude": 100, 
            "latitude": 100, 
            "param1": "value1", 
            ...
        }

    **Required:**

    - id: the id for the location
    - longitude: the longitude for the location 
    - latitude:  the latitude for the location
        
    **Optional:**

    a location can have any number of optional param-value pair for search
  
* **Success Response**

        {
            "code": 0
        }

* **Error Response**

        {
            "code": 1,
            "message": "error message"
        }

## Delete a location
* **url**

    you can think index as table in relational database.
        
        /[index]/[locationid]

* **method**
   
    DELETE

* **Success Response**

        {
            "code": 0
        }

* **Error Response**

        {
            "code": 1,
            "message": "error message"
        }

## Update a location

same with **add a location api**, provide the same location id for update.

## Search around a location
* **url**

    you can think index as table in relational database.
        
        /[index]/_search

* **method**

    Since not all clients support GET with body, POST is used.

        POST

* **Data params**
    
    data need be encoded in json

        { 
            "longitude": 100, 
            "latitude": 100,
            "distance": 100, 
            "from": 0,
            "size": 20 
            "params": {
                "param1": "value" or queryObject,
                ...
            }
        }

    **Required:**

    * longitude: the longitude for the location 
    * latitude:  the latitude for the location
    * distance: the max distance around the location
    * offset: the start row's offset, begin with 0
    * limit:  limit number of result rows
    
    **Optional:**

    * params: optional search condition
        
        support param-value or parame-queryObject.
        
        queryObject format:
        * equal: "value" or {"eq": "value"}
        * great: {"gt": "value"}
        * great or equal: {"gte": "value"}
        * less： {"lt": "value"}
        * less than: {"lte": "value"}
        * not equal: {"ne": "value"}
        
        operations can combined. for example:
        between: {"gt": "value1", "lt": "value2"}

* **Success Response**

    the results are returned order by distance ascending.
    the distance field in result is the distance between search location and result location in meters.
        
            {
                "code": 0,
                "result_list": [
                    {
                        "id":1,   
                        "longitude": 100, 
                        "latitude": 100, 
                        "param1": "value1", 
                        ...
                        "distance": 10000
                    }
                    ...
                ]
            }

* **Error Response**

        {
            "code": 1,
            "message": "error message"
        }




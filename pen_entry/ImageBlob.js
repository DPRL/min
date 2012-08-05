//
ImageBlob.count = 0;
ImageBlob.type_id = 4;    // unique per class

function ImageBlob(in_image, in_inverse_image, x, y)
{
    // identifiers to build unique id
    this.instance_id = Segment.count++; // unique per object
    this.type_id = ImageBlob.type_id;
    this.set_id = Segment.set_count++;
    
    // the layer we are in, 0 is bottom N is top
    this.layer = 1;
    // a javascript image object
    this.image = (in_image);
    this.inverse_image = in_inverse_image;
    
    // transform info
    this.scale = new Vector2(1.0, 1.0);
    this.translation = new Vector2((Editor.canvas_width  - this.image.width) / 2 + x, (Editor.canvas_height - this.image.height) / 2 + y);
    
    this.temp_scale = new Vector2(1.0, 1.0);
    this.temp_translation = new Vector2(0.0, 0.0);
    
    this.size = new Vector2(in_image.width, in_image.height);
    
    this.world_mins = this.translation.clone();
    this.world_maxs = Vector2.Add(this.translation, this.size);
    
    this.dirty_flag = true; // Need to update the SVG on the screen
    
    // Create an SVG element with the image embedded within it, this is what will actually be displayed on the page
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute("xmlns", "http://www.w3.org/2000/svg"); 
    this.svg.setAttribute('name', parseInt(this.image.name));
    this.svg.setAttribute("style", "position: absolute; left: 0px; top: 0px;");
    this.svg.setAttribute("width", "100%");
    this.svg.setAttribute("height", "100%");
    this.element = this.svg; // Compatibility with code that expects this object to have an 'element' member

    this.svg_image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    this.svg_image.setAttribute('width', this.image.width);
    this.svg_image.setAttribute('height', this.image.height);
    this.svg_image.setAttributeNS("http://www.w3.org/1999/xlink", 'xlink:href', this.image.src);

    this.svg_image_inverse = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    this.svg_image_inverse.setAttribute('width', this.inverse_image.width);
    this.svg_image_inverse.setAttribute('height', this.inverse_image.height);
    this.svg_image_inverse.setAttributeNS("http://www.w3.org/1999/xlink", 'xlink:href', this.inverse_image.src); 
    this.svg.appendChild(this.svg_image);
    
    this.classification_server = "ImageBlobClassifier";
}

/*  This method expects an image element which can be placed in an svg element as shown in the
    constructor */  
ImageBlob.prototype.private_render = function(image) {
    if(this.dirty_flag == false)
        return;
    this.dirty_flag = false;
    
    var transform = new StringBuilder();
    transform.append("translate(").append(this.temp_translation.x).append(',').append(this.temp_translation.y).append(") ");
    transform.append("scale(").append(this.temp_scale.x).append(',').append(this.temp_scale.y).append(") ");
    transform.append("translate(").append(this.translation.x).append(',').append(this.translation.y).append(") ");
    transform.append("scale(").append(this.scale.x).append(',').append(this.scale.y).append(')');
    image.setAttribute("transform", transform.toString());
    
    if(this.svg.children[0] != image){ 
        this.svg.removeChild(this.svg.children[0]);
        this.svg.appendChild(image);
    }

}

ImageBlob.prototype.finishImageLoad = function(in_canvas){
    in_canvas.appendChild(this.svg);
}

ImageBlob.prototype.render = function()
{
    this.private_render(this.svg_image);
}

ImageBlob.prototype.render_selected = function()
{
    this.private_render(this.svg_image_inverse);
}

// determine if the passed in point (screen space) collides with our geometery
ImageBlob.prototype.point_collides = function(in_position)
{
    var mins = this.worldMinPosition();
    var maxs = this.worldMaxPosition();

    if(in_position.x < mins.x || in_position.x > maxs.x || in_position.y < mins.y || in_position.y > maxs.y)
        return false;
    return true;    
}

ImageBlob.prototype.line_collides = function(point_a, point_b)
{
    if(this.point_collides(point_a) || this.point_collides(point_b))
        return true;
    return false;
}

ImageBlob.prototype.rectangle_collides = function(in_corner_a, in_corner_b)
{
    var mins = new Vector2();
    var maxs = new Vector2();
    if(in_corner_a.x < in_corner_b.x)
    {
        mins.x = in_corner_a.x;
        maxs.x = in_corner_b.x;
    }
    else
    {
        mins.x = in_corner_b.x;
        maxs.x = in_corner_a.x;
    }
    
    if(in_corner_a.y < in_corner_b.y)
    {
        mins.y = in_corner_a.y;
        maxs.y = in_corner_b.y;
    }
    else
    {
        mins.y = in_corner_b.y;
        maxs.y = in_corner_a.y;
    }
    
    var my_mins = this.worldMinPosition();
    var my_maxs = this.worldMaxPosition();
    
    if(maxs.x < my_mins.x || mins.x > my_maxs.x) return false;
    if(maxs.y < my_mins.y || mins.y > my_maxs.y) return false;
    
    return true;
}

// translate by this amount
ImageBlob.prototype.translate = function(in_offset)
{
    this.translation.Add(in_offset);
    this.dirty_flag = true;
    this.update_extents();
}

ImageBlob.prototype.update_extents  = function()
{
    // because scale can be negative, this gives us opposing corners, not mins and maxs
    var corner_a = new Vector2(0,0).transform(this.scale, this.translation).transform(this.temp_scale, this.temp_translation);
    var corner_b = Vector2.Add(corner_a, Vector2.Pointwise(Vector2.Pointwise(this.size, this.scale), this.temp_scale));
    
    // figure out the actual mins and maxs based on absolute position
    if(corner_a.x < corner_b.x)
    {
        this.world_mins.x = corner_a.x;
        this.world_maxs.x = corner_b.x;
    }
    else
    {
        this.world_mins.x = corner_b.x;
        this.world_maxs.x = corner_a.x;
    }
    
    if(corner_a.y < corner_b.y)
    {
        this.world_mins.y = corner_a.y;
        this.world_maxs.y = corner_b.y;
    }
    else
    {
        this.world_mins.y = corner_b.y;
        this.world_maxs.y = corner_a.y;
    }
}

ImageBlob.prototype.worldMinPosition = function()
{
    return this.world_mins.clone();
}

ImageBlob.prototype.worldMaxPosition = function()
{
    return this.world_maxs.clone();    
}

ImageBlob.prototype.worldMinDrawPosition = function()
{
    return this.world_mins.clone();
}

ImageBlob.prototype.worldMaxDrawPosition = function()
{
    return this.world_maxs.clone();    
}

ImageBlob.prototype.resize = function(in_origin, in_scale)
{
    this.temp_scale = new Vector2(in_scale.x, in_scale.y);
    this.temp_translation = Vector2.Subtract(in_origin, Vector2.Pointwise(in_origin, in_scale));
    this.update_extents();
    this.dirty_flag = true;
}

ImageBlob.prototype.freeze_transform = function()
{
    // here we move the temp transform info to the final transform
    this.translation = Vector2.Add(this.temp_translation, Vector2.Pointwise(this.temp_scale, this.translation));
    this.scale = Vector2.Pointwise(this.scale, this.temp_scale);

    this.temp_scale = new Vector2(1,1);
    this.temp_translation = new Vector2(0,0); 
    this.update_extents();
    this.dirty_flag = true;
}

ImageBlob.prototype.toXML = function()
{
    var sb = new StringBuilder();
    //    sb.append("<Segment type=\"image_blob\" instanceID=\"").append(String(this.instance_id)).append("\"/>");
    sb.append("<Segment type=\"image_blob\" instanceID=\"");
    sb.append(String(this.instance_id));
    sb.append("\" scale=\"");
    sb.append(this.scale.toString());
    sb.append("\" translation=\"");
    sb.append(this.translation.toString());
    sb.append("\" image=\"");
    sb.append(this.image.src).append("\"/>");

    return sb.toString();
}

/*
  This function takes image data and creates an inverse image
  and then returns it as a dataURL.
*/
ImageBlob.generateInverseImage = function(image){
    var temp_canvas = document.createElement("canvas");
    temp_canvas.width = image.width;
    temp_canvas.height = image.height;
    var temp_context = temp_canvas.getContext("2d");
    temp_context.drawImage(image, 0, 0);
    var inverse_image_data = temp_context.getImageData(0,0,image.width, image.height);
    var pix = inverse_image_data.data;
    
    var rgb = RGB.parseRGB(Editor.selected_segment_color);
    for (var i = 0, n = pix.length; i < n; i += 4) 
    {
        var brightness = (pix[i] * 0.299 +  pix[i+1] * 0.587 + pix[i+2] * 0.114) / 255.0;
        if(brightness < 0.5)
        {
            pix[i] = rgb.red;
            pix[i+1] = rgb.green;
            pix[i+2] = rgb.blue;
        }
    }
    temp_context.putImageData(inverse_image_data, 0, 0);

    return temp_canvas.toDataURL();
}
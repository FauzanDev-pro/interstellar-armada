// shader used for spaceships

precision mediump float;
precision mediump int;

struct Light
    {
        vec3 color;
        vec3 direction;
        mat4 matrix;
        vec3 translationVector;
    };

// uniforms set for the whole model
uniform mat4 u_modelMatrix;
uniform mat4 u_cameraMatrix;
uniform mat4 u_projMatrix;
uniform mat3 u_normalMatrix;
// uniforms that set for each group of the model
uniform float u_luminosityFactors[20]; // the luminosity texture will be multiplied by this number

uniform Light u_lights[2];
uniform int u_numLights;

attribute vec3 a_position;
attribute vec2 a_texCoord;
attribute vec3 a_normal;
attribute vec4 a_color;
attribute float a_luminosity;
attribute float a_shininess;
attribute float a_groupIndex;
attribute vec4 a_index;
	
varying vec3 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;
varying vec4 v_color;
varying float v_luminosity;
varying float v_shininess;
varying float v_luminosityFactor;

varying vec4 v_worldPos;

varying vec4 v_index;

varying vec4 v_shadowMapPosition[2];


void main() {
	gl_Position = u_projMatrix * u_cameraMatrix * u_modelMatrix * vec4(a_position,1.0);
	
        v_position = a_position;
	v_texCoord = a_texCoord;
	v_normal = normalize(u_normalMatrix * a_normal);
	v_color = a_color;
	v_luminosity = a_luminosity;
	v_shininess = a_shininess;
        v_luminosityFactor = u_luminosityFactors[int(a_groupIndex)];
        v_index = a_index;
	
	v_worldPos = u_modelMatrix * vec4(a_position,1.0);

        // applying the same transformation that was applied when creating the shadow maps for light i
        for (int i = 0; i < 2; i++) {
            if (i < u_numLights) {
                v_shadowMapPosition[i] = u_lights[i].matrix * u_modelMatrix * vec4(v_position,1.0);
            }
        }
}

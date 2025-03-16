from flask import Flask, request, jsonify
from calibration.calibrate import perform_calibration

app = Flask(__name__)

@app.route('/api/calibrate', methods=['POST'])
def calibrate():
    #Extract parameters from the request
    data = request.get_json()

    checkerboard_size = data.get('checkerboard_size', [9, 6])
    calibration_type = data.get('calibration_type', 'basic')


    #Call calibration logic from calibration/calibrate.py
    result = perform_calibration(checkerboard_size, calibration_type)

    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)

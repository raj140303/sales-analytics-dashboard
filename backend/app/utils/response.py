from flask import jsonify


def success_response(message, data=None, status_code=200):
    return jsonify({
        "success": True,
        "message": message,
        "data": data,
    }), status_code


def error_response(message, error=None, status_code=400):
    return jsonify({
        "success": False,
        "message": message,
        "error": error or message,
    }), status_code


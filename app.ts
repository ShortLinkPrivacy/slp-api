import * as app from "./application";

var p = app.props;
app.run(() => {
    p.logger.info("Listening to :" + p.config.get('express.port'))
});

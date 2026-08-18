"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs");
const path = require("path");
const electron = require("electron");
const THERMAL_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADHCAIAAADTbIscAABCMUlEQVR4nO29aYwkSXYm9t4zM7/iyvuuu6rvY2Z6TnIOksNree0xBCmJK60g6IcE/thfkv4IEKSfEgRBKwjSAgIEYcVdCsvlkjvD5ewOySFnpufqnu7po7q7urq67qqsvCIzTnc3s/f0wyMiI4+q6isrs5rxdaA6I8I9zNzt82fP3mWYnn8NEWGEET5S6IJVI26N8BFCRDQJACJK8ckOevHdz6T38OMAwIDFj37UtC26u++vfrCvPkyL+xwqH/FVf5iefzRt7bqoYW4MXWl/0AX07t+QnWfcu/V7YPjc+x78foF3/9kP9tWHafFuB3/gtj5k6x++oX3b2vXV3vHdyRYtgACI77PXcv+HB4f//KjvCe5q4UN/9WFa3A0Z/PuRiZgP0/OPpq37XpTsPE1/MCH7vojyAJ60o4mP5YXf46KGv9Lv9+QRRtiLvYTpE2tobpP3NNONMEIP+7LlPSzvRhjh/aMnsbivseFoFhzho8BIYo1wIBgRa4QDwYhYIxwIejoW9kxfo9XgCO8b2LeFDuvnPYl1AO68Ef4WYS95RlPhCAeCEbFGOBCMiDXCgWBErBEOBCNijXAgIAAQGflxRviIQTAKeB/hALBP2MwII3x4jHSsEQ4EfYm1r1l+hBE+KEYSa4QDwYhYIxwIRsr7CAeCkcQa4UAwUt5HOBCMJNYIB4KRjjXCgWAksUY4EIyINcKBYESsEQ4EI2KNcCAYEWuEA8GIWCMcCEYG0hEOBCOJNcKBYGQgHeFAMJJYIxwIPnY61nusHDeS0AeMkcQa4UDwsOlYKHBvqfReJe4+x/XuwcNyK4429i/HfcSBxS4tH3We7cOuBRwpHGVi7bcNghTptf2tfxDhQ2RyD04rWukLQoEdJBsJsA+CI0ys/gYyuOfjj1C0CN6lVjTu5tcI7wtHkVj3FhGFfBr+98O3JftJvgPdZupjj6NJLAF4EIOJACAgAIy7thgC3JaUAiO9/v1jZG7oYbAh6KhEykeCI2YgxWInRQAA+uh6su+MOSBQT8cSEdw+Uva7E3S/u8O7p8+/vRw9ilPhe8T7VbBEuBjpglGDs/cVUR9yvTnC4RHrLlbOgYGqt73PnlUh7DPeArLzQyz+K8iBAB5BIypEQgXiHbOHPstEpKBRISMZ92niPYrPPYdtv98pzD7+kuzISaz7ContA0QEBAGRFGqFSvW2QCjmNWfZOwHQpFAFqUutzZ1tYZ6rqBInE5qQ2XrvEKn4zZF29RHiAbt0hvSOnfzZ2/6ehRrAwMrAgiigA6U0e86zdl6vZ/UV26o78aIpiMtji48H5THy3GysLt94tblxw9Xr4lI0GqI4Lk0llYm545+Ox2Y5bwAQ9kXXAe1/tvNnd735GBIas/PnEXFYhh/gRpgosN+0sm+Luw4TAQRgYURUOmKGxuaN9dtvd5rL6dY6d5qcdUQAPaP1IqKj0tKzP5/Mnz7/8r/ktXrUtBgajgOOjScQFmGrgmThzOeXTn8e2PY3aR/Swh4U+CEnVqGuDC93ROSBEgvvslK6x57zve+FBLwIKx155zZuX6gvv7G5ddu1G9p7AAVIVEyDWrFSQkAdC60UawnkHjsi46EPlYAgCyAyoRLFbK3Lp489/cjTvwbCAAPt/oGOtPQMag8r9iXWA9Gx+iEJdxuuewxjX6PyIKx1eWvj1vW3/6q1dYMzG3S9ZiTSooonQUSAspw8C4qPApmuqG4uuZVqZNkiI/XlEoowOCAVhuX1669dwuDM039HfPdQtCz8ONpgj5ry3jenFW+koIEIiNaVm1devPHOd4hz3bKUAyehC5Uo6OveUFAYmVXO1M2x0+ZKyLVYb2VBHDhEGCYxIgoIsw4rd268HEaV4+e+4H2GqEa6/IfHgzCQ3kNW7YQME6svqxgElQovv/Pd5as/0Ey0llFAPJMwAnoG4e2gBGEt5JS2kVAcgnWQO0Ry4wkoGjJdAQAJIAGIQiYJIL516fu1yZNjk/PeZYD7OCTei01rwMXBwThkzrg3aPsyPhR2azKHJAKPkMQS6RFreBRERJvo9pWf3rnyA+OQNtqqluRlDZ6Ji1UcMvemWlHEueh6i9mDACWRrQTgGRGBBQmxf58FAAVoq8vOm0BDrWQVXrv0nXLtd/aSAwAEBPtSkYV7n/VQuIGKh4Fhp1gcOMv/tsm/I0Gs/hDiTlkFIkwUNDZXrl39fpAjtzOcrTAReg+IUogVJkREEa9QN1PcaotRShtxDKtbJo3tdFlYUBMIFR5n6AtoqUTKMrRTf2czmq62N29trF+cmX3cuQ4iSY+wqACRCAix2G4BNBTWVyl6LAAI6EVARIQFmLcn0500fQD02hMFtI/R9gEYOA6TWAMRBcAAar9DSLxcv/htSjuQMU2VGQSEoe8whkKWFOzKHK21JNEOhawFo3G66hsd7ORcDrFjMfVQCiVE6E+eXqHTGkoV00hhvY1Tweb6qxMTJwERkXQSChIwi7U+yziz3uXsnOSWrRPvoRBdhEop1EYZA2GkolDFodZGEISZrQPPglKw8m+P9na4Me8ioLzSKELeIYAA9286CufalG9eebnduKYpkCoN6S1D8xQRMIMirDfEulCXamGIgs1mM9+ogwm47VArqHfIM7e6OFtjU3iThQW0RoVip+LKlkszn6cbjebN8akzebu1ceHt7sptu7XF7a7ttjjN2Vv2HphBWHpPPQIiIBIiEYE2Og5NUlHjY8nUeDI7F87MqlJJvECWCQDQtkh+ENLrbgHcPYl9gB04NIklwoCas7pf+X/U+K/56pPGtaUvt0SYKEy7jeUbP0YyQFqEe76XbTkHAIAgTIjOh57mn/1UdW5Ga80InOZby7ebzY0tm7KVZGIMiTrrdb/VkekqAbNAEKpyNSASD4KawjupgG03L5dLx6/84R9kq3cAAAiJFJIWBAIkIiC1ixIigs6D9yzeuiyr1+Ha5S0B1EFYrcXHj9Uef6J88gQIQ5aDosFZ21dxMCTb1USh7h1EQ3txiGEzIqDFLavGK2w3Vfhfi4oQpK/tMuno9q0Xfd5QKmJ2RAYbHS8C1XhArN6NI/TdfGJ2YerUyTxLfSFOomD8zOkJPtVsbzlrK9UqoM6a7WuvvdbwDlmhlqSiwQh7IQQwrMgjYLdxw81YojBADeVEnJdC994OVd7p72ZBo3S1Bs7n7Y64XAUhAiAgA2etze4r6/Xzr5ZOnpn74peThVnudIAU7KXmAQuw7YVq/zoOdKgPUccikFwFJ/PSOdO97Bvfpqm/h74NQACCpPOsVV+5oMiACGqNqy1OM5od2zGqhFIs0nIfTpacyxmEkACAmcV7RCglVSLynsX7Uq2WlCoSpanWlFrSKG2XtZ2pmUBh7jlruDy/Mzm/cvxr/+G7/+L/klYTjBGRuwwCongfBdNPfiKaX1SlyHWy1jtvbb35BlDPekBak9YA0r34zuXLl+d++Zdrn/yE6nRE7atTPiD00wkOEIcZQYrsJKxR9YsoKK3XxXWKqVAEtDKb6zfz7roU2ksr942WzNYc9WfDYinWceKZQQgACZlo+KkvwkFFxDkHIEWEjFZaga+OBWHbgvdc77qWtZ7FgXPeOmbHzdXL0Vjl2G//HkQJeI/7mbUKGwN7jidmSkvHKiePJ3Nz1VMnl37zNyef/aTP+8YwEWEWFowjUnDzm/+m8cprnETAvNsV3cfetnYYPoaw6+2urw4XhxqaTEQ+pfGfcfEZTC/67iWECERAkFm26u8SICOAiCw3YKaGAZF4Bu8JAAFSTxtpkOhKLYpLoTiHQ5dT3F5E9MyAWOhlqIhMkLUcdx2nDrxIzgyS55CtZZ6ACAiw2VpxnW5lZnr6y192ud3XXgoAACgIJk5MrQoKxVl2ueS2+sxTpAPiHYeKOFFK6XD5e8/b1Q1SKMLDIUDQM1cID0GYhRnuQrv+276dozheGI4Aww435p1EvKKEp/8eC1LnvC+MQ4jOZjZf1USICCstVVKlpVK5qhItEeog9YKATWcUxmNhEIiOyee2UOwRwLNERodGZc6VK7H0zdEsklTLruEaWx2XudZm7lJP4p11tp6CUeKZkLJW3Xnrbbe8eILCCLzHvQmOvTUEUhijDkQEkZCI2VOpoqK4iCWEYcVcBJWRrN29dkOwFw4t7BEQtcYgpDDSYVi8VBiqMKTAkNaFgVfED1TvHmuYgT2iIhOQCSkMKYzQhEIkzMXNOCxuHZqO1fd1EPiWrjzL1S9L8/s4+XcBCQltt01oKTTsGLscnamgBmw7n+dBJRHWphr4mw0AEAZ2AIHONlrIgggsoAO8sb7xf/+b56/fXvvMs4/8o1/9AngUArY2np2qXA422ZMi10yZGL1SuQPwHCiwjkBs3rRp00SzyoQYaMm6JHrArEEsaC9gjDRSbwYHEARFIEwiIIgEOy0LKCIaHTt2nhBIG9DKdVq82bVpl3Mr3gl4AEJSpAjDUMehjmKKQk2RyzLhnhmPgJVSHGjXbNlOx3czdh4ITBjpUqxqNfQMuROlDsXuf5gG0r6Fk5TkOPWLft0UNkSCKLN1wCwqhb6T5VqkFJCA61gIENNMQgrL1EHvWpjVc3DOizM5gXWgkMVHFHz/lQu/8uknTizO/rM/+8tX3r36mccfSbsZAeggmlw81lm+4CqxanQlNph70xVAFEXUsYrIStZpbZQnFgoblbAgDS8Id8ovHDiJCq4xp7lYh4S71/ZELs+jyTmdVFAAje6s3Fl/6eXO7du+1fE2JRYUEGEGBCIEZEUqMDpOzHilevL02JNPkg7Ee0EBpLyT3vzWd7tXL7tuKs4DAIMoMipJ4tmpmS99KZiaJusecHhZgUN26QgCAxFnZOZw4R95dsheoYhLAVgZAACFSIQCBI5BcL3RmlioiWUMDW9klHpWKGRyl7osU+VYCWSZ/60vfS4JtBf+b/6z32m0OjbNexaDPJs8faK1dvtO1lAEKCieyaIoFEYFiBmDtq3OygwBACMoLOInBvlhANCfXAVEGEU8iBIGEWtKtfZbl6TbgqiE3NOzBABBJO2acrV66mwwPkZhYBuNq//6X+dbG8ZEQEhaYT/+YrBiJBFwud9K8/pa6623WteuLf36byCCMGOSLP/1X2++8GNTrRAiBBoAdaGtpZ3GG+d9o3Xst3+HQgOH4aw8EnmFgoAgYBt483+Q9k+AYuzlgAGzECKgsAPo8P/7F+f/yZ+/Ve+6QBGGoaBAJxNCBEgNuE4K1PPdEUInt7n17XY70EOBjCieeenZz0xw2eY5N7tIJJ1cCJHFKwTrUaDTXEYngGqgA+9VhxEAhe3WaqHfqDAw5bHu6sbqj75HShfr0J608F6cVzNz4898MjlxPJqsiYB4h1lm4hIYPcgK2v2CwjmpdRiZOLKbm+nNFURCIUEOylUyBpUGAOh3sWgXo0jFpWxtDdXhpPQ9CJdOP4RtZ9L6YAIp4qgEAQXJeJUgiPPCjnUomiQD9giUuheub17d2Pz9Lz4ZpLCxmbH4eKzqU3EVC6Qcic2yCJGl55ijnozpD1CvZWTvVRCc/txnly+8vXHjWtbqGIsgQCXDhlA8OpW116x32z4R3G32QRAQUEql1y+v/uCH1TMnXKvdXLnVfOsCd5oQhOhZCjOH1sHEeDJ3Mjy2EM7OlMdqjMjWBZPTE5/93Opf/4UqlR3eMxFIRNhBEJXPPUZhAAhAIB079bnPp3fuNC+8QVE0tMAE5qxy/FT53GO6Vu0tZx44HtBUuPfqhm8jAgIwUMAL/y2xFemCKrUbTilAVALUaWYVDt/d2PyFT51YmKrVPbkuA2EYR0mlerNxw02WTOEmgvvfRyJinwPSwtNPzZw5ffnSm5vrdwJGWmnIeOwiHaQ+t8083wxUsodRQ93urT5w/cXvrb/0ffQsLBQGpEPxDEqFU9PhxHQ4MxuNjweVii7HKoqYPbAAgs/y6S9+QUBWv/MDHSt/j4cbkb2vzR8vzS2Gk1VhKQhP4uZ/7ZeytdV8q45aF+Y9Bq49+mR88kxlYS6oVpj5MHj1YKZCQRDcNeAo29EdAljoK8RdwcwDRqaErDqNLM3Y55460ub8KydmnpqfbWZegUMCJgLmytwsZaSK6gtSTD27L2qvQadYr7luFkSlsYUFXw3TSRMfmzMmsKGEOblu2mmtIO3z4PV/CwuTKyukICKlIDCUxKCDogEUkCy3jYbvtlSpFE1PBrWaMIPn/h0Q7vq5L//czC/8HKfursayvoYUTE6HU1OgVc/UgWStC6Jacu4c5BYQBUTETz76dOnRp6onl4KxGvseWf8WrQp3eBV6OqsAAgoCeCBFSguwc0wCgsIA41HMgYaMhZlJiAEQo1qlFJU2vdNCKg6L39ivwb3LORAC522oQ3I8Vps8d+bTnfbmhXdfdsZGjc765uXa2DnAXqmjfSFIwhaUMnFVWHyWu6yrjCKlQdg2NvPN9e71K1svvhBOTpefemLi0SdNpeTSriAWhjXXas397Of91ubaT17QSSzM+zbEzIJCkREvg2UoIDKIOM8ICkCsL508FZ05U16YMXHIzh9ifM4DJdaOgPa7AAEBrI5LxoS5ayMiCHgRBGTrRBkgREZCxWnHlGoqCpIgXLPdKqh4fEw8Y9+vs+12RRQBYAFEQYHtXHsUACLSYXB89lz9zculWml6aulm+k6lTo1rr3WmntEq8NK+W1c9W12ujj3xbDAxFUah9667vLxx/jXuNFEZIEClEERYuisrnW8tb7z40uQXvjD1zDNs855FStB1sumvfKl55XLeqJPSw50flCoRkXRtA5iJepHeCIKIPuvk126gJnBexaXkxJlkekIlIece6DBXZv22i5npIPldLFfeSxsiEpokiMfZM7Bg4Ve2Is6jRvACpMCTavH4wrz3nhVivTszs6DjCEX6bW2H0AsAe6eU9t4R8PC8KCKa6PTxx+ytuiV75+r1ktUq1Hkc8XL9xrvPgxCD3l//QWCWaPFY6dTp2iOnw5NL5dMnp7/ypRO/+7u6UvM+LxYOIiBIYAwlsW83b33j3175xjeKHCEQAUR2TofJ5Gc/J5m/2+1RRN3bN7L1DVBUVA1AFgpM58at7uqyMkacD2dng+kpUy2Dk2FWHYrcOhLmhgLDTycqldSOCXt0ggCsCDILiKANO28jJbfrc3ML0eQUW99e21gYm6uePMnOCtJAJvZNTiDM5cmJH77+xlqzbf0gaB0AQIC1jqqVCSkHc0+ew3LsG50ojPISE6ut6+eblQ0FCCh7lXgRQEHSUVitIoD33nnnOp1odnrqy18Sz7Q9ooX+40GpsBR2fvryta9/E4AKLyQSuTQbe/KpcGGBrYPhMMZ+S6hU1tlqvnMJRENvKhRCtfn2m957YMRAJwtLwfhYL8ftsNEnVqFfP5AOMW6/9u+TEAlXqjMSaGjlHCFopdc6XAldZlksWzdVmRw/e5KFW3eWJ+fml55+WnqmLwWoATSAxiIPR8So4F/9++//0V/++A+/+e3/84++EWjDhddWpKgn4rxPpifYuoiUZTE6AmAeL+lNzsdsNsXMKL1lAW0LAAQEEdQIKMKqiBBFJe1O9fjJoDbmrd22eiMLeBDvhbFSaVw4v/bjF7U2PVuIeGXU9Gc+K26b9LskjSJqvvtu1mgAEQiDNnmz2Xn3ktbGudxMzkRTc2EpEL9D29hfXPWWUweIIySxBkAEZh+UKyYPoNHhmRqtNpnFV4O46xZOPPrZJ587/dynS2NjGjmqVScfPesFoXADD9VPK3IZAq232q3/8Z9//Zuvvn1ro/Gff+1X2TPKDh0ZAcR7hZR1ukGlJIjgkY2HqjLLnWzaZRM5Oewb3redyr2ThyAInr0KEzM5Jey3RVYRLCgAAAysTVB/45VufRWVBgFE4jStPXY2WVj0eT64EBg6nbTJ19fSy9eAFDCTCRrXrvrNJmok1KW5JTNeVkrx0QqbOXgd672DERlYm1LURZksYcdiJw+Xpk9Mn378uZ/5ox++9ac/euNf/dXz//0//cOV9VZ5fNw7TwCAWkANu+cESEA7hnIp+PLTZ7ud9Nj0xHi17ESQFBEhFeWOgAS0UsvnL3rnw/Fqp9EgReS8LyGEAd1u57OSjnvwAiIMvTiWog0UGFhOti0RCoPKmPC2yR6G/CooglrbdqN9c1lIABlQWESZYPpTz4HzMHTWMETs1sW3ObNAAOwab10QQvZsatVodi4sl4B3rHz3FVcC95ouPiocLYm1ndMHgoA8XXHVEIhgfpxzNxZVWOjvfv6pb/7g5f/1T7+9vNH4x//7P7/47rUgCniw0NN6kOVXCBgBCnT4X/3DX/+ff//3vvZzP+tTp0DYsut6nzsCUESIKJ4rM5NLzzy2Wr/tbAZIgIgtm44bMkqtdNMF35nORTwxAvRilfviaxcDEEC01iJ3tVQgAHh27S74nsJeaFqlxx9NFk56m+HONV2vgpfRreVb6c3bOixlK6uda1d1YFAkml8MJscpNMxyRKpdHi1iDYMQARU658s6J9fOuq7V/unVm//kT/5yrd39zLnj/8d/9/v/+Le++s0XXhf2RZYfKEpXV/O0BSQAvhhvRZh7GS9XfvdXfubE3NRWvd3eyLYu325cWW5eX20vr2etlveOCaKxar25srFxixShCCCQNmE9d9NaZ6K30u6szWa9KM+FQgUgWLh2ijcAIIIiwCjEnveO747IPkIQX6Q59j5jViYY/8xz4GBvfCmIIBFnnc23L4pSm+9c5LTNIFQqxfOLplbaJeH20qs/Kz0I2h2JhNV9gMjOOZ8iIjs7PXkyMG750qXHP/vJ//If/MrNOyuTtUq21f7SJx59+rGT1gmiAhDSKr2zajvd2Z99znVzREJAEU/gnYe80W3XWz5Hanfs+pYeq2S36t2KhutZZXoyWZp+891XsqwF2LPfA4MECF2i1NvphNa6pXGSMtuS1pctiN4updUfrJ71HBHEu24bsCfbYFvHGkTqAYURJmUeCntFIpd2Ko+cTmbnuxvLqI3stM4KACnqXrvWubXcunhRK+29D2fmgsnxIAzuYlvdgQemfB1FiYUiBJTbzLucPQdBXM0QG62s2c7W6udOL/38p595+uwpL67jfCk0hL3UZLG+dOZ4PDcL1hdOG0bRgVFRHMQxMLiUNSGDDWYmsVwKlqZQ/PSTZ7Ms3Vpf7uSbjDz0QIsX9gnplkgMOo4CVvFUggb8DKHnol6JiB/O2Sn+59lmW3UktXuOLLiFJD6Px6fC2hjRzmw2zyaIxj71DFvGvUlTIqiIu431v/6O3ayjIqOCZG4hrFWBCOSuWvKwVe/B4BDMDfeHgCLKOps+74LPjQXf7pYWppY+9czqG+9knW7bZq00ByZU6GQ7LECYg6hUPXmc2SOADigAaV+9vfrq25sXr5LGqJo4b7FSwVJZJ+HY4mwY6aCcqFDfvH5ZkSbAQRw5AKAQGxBAgxTOJ1zPddnoHFVZeS2F+whtDuJRhqYzbbob6/nqmiocwwAwHERKBNZhksSnTofVWNEghhBBEJTiLKs9+kg8NsHOwX4Zpw64cf0dEmDPZmI6np4yccxcOLP2Z9bBmxd248hJrEIl9t6vXP+poEePeaMZzEzWL98Mp6fCWrJ24XK22m4vb26+e6t1e4t6qes935ln9rkVBgqDdHX1wp99952Xr6yu2isXVi5964eR4bGFsVItKk8k5amySowKQ2ddVCq5rmXPDMDsmZlJGIpFBDJRoLUe0+JQcqtKCAIYFM8h224XPAizsAf2qLUE0dbzPxaXC+0ZTATwzhsae+SpZHrW1MqeZVeEJ3uvy9XaM0/JsBls52+g1gKMSNHivBkfw0CjHK3M/aNV511EBFiZ0tq1C5n3KqzA5p3c+brbmjv7CHdtVCm3rq/lbWuU9s0WHk9sbnUSaERhpwhBkxfR2nTeuPLat16ofPFLJ770sxQbRL367b+++jc/Pve1X1SaQJiZCRhIucwGSTlwgXRJ0jwsx16k43IOSQMKCqCYQCkSQfQ5qJJRqRejpetEk72z7FrNYPoE55YQXbd58y/+cvPieRMm0s+n6Pt2BPIMy7Wpc48nJ46VFqcJlfBOkSSIQJLZ6pNPrr/4EvtsF7eKPapEELxVtfF4ej4ol4F3a+S7SfbASygcOeUdiXzaXr/1aliqdDcvBY68gVvL78SL0WSQtDZa8dikGq9KJ9XT07oSBYFyzc7NF863ttooUhpPKrOTrVtry1dW5/7BP6h9+jnfTiV1QDz+5S/euHI5W6mriSrkHgFAESoSa4Op8XOffpZQ204aViqIdPnN1xrYrkxVGdh129RPUczSLCknEIIggwihtmnn5r//89qZsyKSNrY612/i1haVo368oaCIeOdFtDLRsVPR6dPlufnS7LSYQLzfx8aK6FweTI6Xz57dfP0VFYWDkIdBYYsiFiyaWzRTNRUacduud9jLqsPAIRQFGS6nPoAAIAsK6yC5felHujKeb95Cm7IjiFh5uXz55dthrMFUZ0+hMVQqmVhHpUgBXPzWj92xM+Vnjrn1rebN2xvv1k157MQ//KXkzCnbzRiFAMVbUnE4Nim5LSwZoJRPs82VlaTbbW1sVCbH0rRTXZxnx6TVsZNnry6/aQwCklYKAmAHzNa3iUxKEGLHoyIEIEN+Y31l+XYxoBQYLgXkXD9PkNkYVS6Xx6dK88fChblwohJVKiyEnqW47b0SHQC9uDQAQfQw/vgTW+fPQz98dcjIB+C8KpWS+cWgOnbvoeMd8UkPDkdCYkk/JEEp3W2u1bfulCdPrF95Xksg7EQTCpCibt6Jgrg0nZCJkFlpAqWyZiOzcOJXf0USrQQJgbyjILAkbqsll96m6TkZmyAT5hubWF8LnnvGO4+ISqnWWqOxsj42NenSvL1aR8CV1uXp08cBe8VyBcRuOpflWgJ/u+tBHGGrmUdrLkipt2wQAEQVBL0pjYWsB60gCqhUMeVaODEWTkxHExO6WgqiqMj372/sggBFYD8RKWBh9kCESJLn4dKimZ5263dAm2EdhRAdcGl23kxO6jgQvysD/EjgSOhYBIX7n0lHW+vXo/G5rbULLA67IMoBGfAsIgrRsxVnKU56IQqedbWmMK2/8vLEFz6fNjeVCfnyBf/GW3T8uGs38xd/FH7uZ8Mv/7y2/vqff2t+topxGTqpoANS7fXm3LnT04+cuvj8iwgwd+7U7cvXV65cmzm2uHL9qgtt3vL2VsbIstah2xnUAkQCz/HYYlguCTD0igqiKCIiVEaHgYrLmEQmSUxcxlKsotAYhUpL4YJ2An2rfcEHFZa8y10nxdAEUZzmKQGIF1UulR85s/6dG8YEA0UMAcSzCaPS4lI0XiVEHhqyfSbBv92lIvtxS951Wus6mehuXCMKOetKpAaGbUS0Nm2tb0zWxp21pLQwoNbzT5x98+vfnHjksWgs8QJZo5G++VO49LoIqVrNPPYYbrav/smfRq3VyV/8ik3zXkhC5azH67VplVu/8Ogjzc3NW+9eWThzcvXG8s033k7BdbyDddGph5kQN1MJEMqB2HT+1M8snf1Z9rzjKSREJEQRBUgKCIEUCXKR8MwivrdyHWSRkBRn4coLP2y88abtdkHT+BNPTH7ui+RzBiDnaksn6iYUGI5YIHZZaelUMD1nSpEwD0wMR0G1GmBArP1cXg8UAkRZ2vUuVdgVtymQEIM3BMJ9d4mIwtXrlyYWl8ho51mRst107FOPL15bPv8//S/n/tP/KDp7svIzX6YwTF97DZI4eOa57rXV9e/8cW0CT/zGV7wY9B0Jq6Z0AuOZ0tIJlGUE0rXK9MSYiUIgffyJx7yVlebN9cv1uOHyMRN0PDSdnQnzrDl77NMnn/yqIJPw7kgHLCrxiggIC0tR0LI3GxSLueJYRCQBAU9BdPOv/mrje98zUeQ1KYbVb/+FbbcXvvrLxDlYG05PBZVa3q6T6gXYCHuK4+D4STNeRULwu1X/oRt6mBgo74faCwAAQCTvHQCj6ibluL0pAMjAwP2QPRYTx1mQ3fzpT+YffdqM18CzeObMnvitL+O/+95b/9s/LZ08ER1bHP/UU7W//9vgmZub3TdfOfuVJ8rHpvM8B2+pPK9LiwJa8kZ5ZunOpYvzUUwUuDyvTk8zewEEA6ury8Fm7qpGa/RrLT8e6UplYez4sSe+ysggjEQ984iIiCCAcD+KgbAvPYa30+z/jYXHTsiY7spK86WfmmpZEIkFNOnKWP2ll8szi+NPPemz1ERJMD2Vb62hMgKASJaz6tKZZHoyqkTAcveCJdtZd4eCo5FMUUBEK006cLattFaadUBYDl1m2XphMaUoKUfpmqurevPV785MnK4eO0ZjJcxz6/DUr/387CceXb9wXexW0r5V6gp5C9pPfPEJ9OByCxhCZR6DcQeitAcySWVRryy+c+nF+fmzSVQGEUJlnV1evuJublCiXUnLapdL4exTXzh28vPB2IQX4DyV3IlzhVcYtUKtkDRqAiIU5tx6z0A9TWo70r8wLfTjWpXSdmuDvQejC0VJhEEUKlV/5aelU2c5opBIj48J9yWez8NqLTlxMpisISnx94x0OlRhcXjEKlZUQ/dFhE0QlaoTnewOBbq2EPvboMqh1JJ2vWWtLY2VXGqznE3b+Rlzs3th9aXL4+PHpj7xCfQ+73aDuamlhRlUyjtu3bmTbnbsVpcbXZ/lznn0mgFZHBGpMKJKJZqcqpw6Y2ftxcs/KsdxFJY8c6vbsstbOjS2qlSXnYPjn/vq4hNfca3unR/9uHvjmtuq+25XnDBgT5UymqLYlGMzPh7OzicLi6ZS4swSAAAygohsO6z7f7B4FSVY5G0NCCeeNLXX73SuXa08dkZEjNKD6AeHMH7qkXh6OqpUxPOw7XQ/BeswVa4jorwLIKIwKk3aQBaSMRRiHmu33IlOVSszZQTt2PGdXAFwQnTDuuMGF/Xa7YvBlaWZ575kuw3nU4eOG61b3/9Rensdco9IUtiGEAFACXgiL5DDOtyCNsvG959f/K3faU2trt38iVIxI5tMaZC8BiSE7TSemJg5+/msm175oz+wV29goIAUkCrUKw/ggIUFBVJhYWAkXYpnvvrzk48+7V1KqAB65Xh7l9qrO4mS5cnCUnTyePfyuxQnwq44ABHB5Ruv/aR69hxGUWd1mZAAUDJfPnMmXDoWTE/u8gMdKbW9wCH7Cklg4N1HRGBXLi/Z7rro2Kc2dXlnq9O6stlt263VeuNWPWNv2p40eQW0btNGx5X0nbd/bNNUlybCZDqaPtfdcPlb10ygdRxQpCnQGGg0iowWo0khGSQTqChU5RjQrf/kR5XKksbQUBBQqB1AqKSX/+mCWtWEyeabb2bXr9N4FeMEgwAVgSJRBIpQGQoCCEOKYlWKTSmEVnv9Jy85w6ARBJCFBIRw4DrkopIIIhAufPWrkCSSWVSDwr5COmhfv3btm1+/8fU/6Vy5ogLDWVZaWiifO5fMzQTG4MBZdCRZBYdOrJ1A721SnqqMP+JsG5Cc9TCR2EaeXtm0HeeYWXuXaGxYSADbaFgcq06+1bz6JirPYH3aLp85qRZmoJ0CQK/+mPTSZHoll3vxwizeYxClazfpTh6G4yw5IjKhN6qoseE158LsoPPuu2QC8CLM/cobg5f01oHCwgwszlA0Mdm6eNVttvbxQ/chiJzlwfTkya99DZPIttsog/hPUSZqvv1G/dWfCAA7lywdLz3+dHlhMayVi+XmAxyXD4JDINY9Aq4RiV06u/Cp6sQn2/UtFGHwPGZYEW1ZzYgsHCpiASHAIjmPhSRtblGR/WddVK0c/93fhXINrIP7mqQRxeZ+vT4z/QnCyHMOoWbNRRUELJU6nZXlt76brdwGrRnuF0qHiLktLy2VT5zw9Ubz6k2bZ6gICocV71CnEQCJpJ2WFhfO/t7vTTz7Sa+1s7mz1jvn2ILSGBpdKY898dTY08+WTp4sjY8VqtWu1Mj73/QHjiOiY21DAIWzxeM/5zazW5t/rYNAPEBFUQdlw8F4AMZJoCkH0SJcCCBh37fnELpuGk9Ozf3dX7/+h/+fulu94+H2FGUrt6ZOnjl16qtXbz6ftzfQxGy7ltPTZ3+hPHd685XXXLMJgcF7DyEiWk/VSu2xJ5mZFCCRwm3dfB8GiKAin6aqVl78O788cfvZ9o0bnfqW63SErTYmKJeDidlwaioar5oo9J6PJo324kgQaxC8C8UEgSzcPvWJX818c+PKSyoMwbo8VppQbeZ+SnMI1GVAAhEBlNyFtYpAP3VBkW82qydOl8+cbr/9BoZlkH0kTVGbD1FQGdttdesrtXNPPPbZ33n3la9Xq4tJbf7O7deS8fnJE59q/PA8s9dgeE/U3i5Y8aXjx8kEkmcikCzMqyBk77dZ1fM6920BvTAyhbkX4GRmrjy74J3l3Iq3DIBKK61JGwZ21h1NdWpfHAliFejXsxNAEvHe56ef/M3Wxi3XXgEicswRUhd1i7mkQQTIozHQASAdTs1JP1EHBARJwIezc603zqtwN62Gytv1KvUxeLu6ks1O16Yee/Lz/zE7G5SmJo89DYStm5dbVy/rwGwHrQ/Jnp0jLUQURpEDD8zB7FQ4PQ5ZL6CliO7sOdt39gZAGFFhgCKCQsaowABwoRyyZ+/tnraOOg6DWPcxCRffKnaZjpKxyTPLjVtGhULAzCpQlIpVqFAwUoSh3apXjh0vT51kZ3spWUWmlBQVWpQnRL+7re2sQABgUajT9dVSq9vdXC3PzynSNmuIgApL7evnod2SJILeXmDFchEEAKgwe/YsoAjAAg448chBWJqZJtvzNw8uWqCIzgcQQGZBpEArrRlE0sy1U59nkFvPXjSSMSqMVRKrOAJhnzsptsjb62geunH3//iB4AhJrJ0QIIOC7PPq7CPttauoQAGJAkeuCEYHHTrfhbHSsU/+OpH2Pi/imaAf48TthuC2ZXKA4TJ9VFRlIHRpN6+vm8lJsVkRuIIgyK5x6RITDidFFC1wn5Y7zEks3lovoEsJqaCwjPdEHfYL4wKACAFgHAJwd3Wtc/VG99a1dGMja7W52QLnKAjBBKLEBGFQroZTE6Wl46Xjp8NaxdoMnNtVSWbfmon7OTceHI4asQrPBhT60ur1F8IkicYWG3cuGF1myYDAxAGLICgHHFZmzz73tdL4vLed3l4p2FNiPLNrtIvqCsMN9Px1O6eVIqG9s3Ynnj+Wd9KwWhHHSpl0q969dUOZoFdVW3oZJzsz7bc7jyLSSZlECAV3tNU/GIG9DgJU2Lh0af3ll9vXb/gsI0AkQsTqI4+pOOpeu+aaTUDy7U632WnfuL7+yqthuVZ94vHpzzynKlXudoV2p+HvwqHy6mjEY/XRsy8JoCK9dukH3fb63KO/9var/xqBnE1B3OLjv95af6e9/DZiZKm7cOyZ6tSJvLuJpGQwfAJCyM7nnRYq1Uv17BOM9txwBAAGVMpubrp2PW9Vw1oZRTDUrTeuQ6sJSQK94GChvhNqKFG11/meSpSmJCKedyVjFeVqkL1Oyt21ldvf/qv2xYsIoAJDcQCAYu3UF76QPPUJdnlpaX7tu9/3aRe0AgCFGkFc2lr54fPNt96Y/Y3fqJw4KZ0ODNlU95JsOy71MHCkDKQA0KvnIeInTnzy1Kd/Z+Xqd1q3f1quzozPnHz8s//JqSd+GQRVhg6aQW16euFJb1u0Kxu9CJzPM+5mpFSvPAip+yi/pDjv2rUNbmc2y5GQvW+9cxGIij3JTRKpSkk83y1yDhGBkNOcWLz3wnt4B0zleOOt1975Z3/QfvttTAKKQ0AUAc7zcG4uGJtI334zv3gRRVeeeoKBexlIzMICSpkkyVvtG3/4L1vvXFJxLN4NZcAeLTPEoW2EWdhIafc0hTCocq4Dn3UnFx8fmzoVlReCMEAKr7/17+rLb4Zkxp/4/OJTvxDFY47TQS6xiChAZiFNebctRRKEiLd5tLhk2y27tQXKDB7j3rxWzHHAiLqztlHqdGyzE09Ptuob3Vu3lNbIItab6WnJ2W7UFUT7CYKiwh7avOvAKZejZ9SamaGn1bGKS+uvvnLzG3+qdIylGJi5UItEgFRl8WQuThNJGCXz85XHzrWvXclur2DQi8RCAGGmQLOz1//sz87+7n9gpibF5oBIPZ/YwQzVB8KRk1jbEBCxcWm+NH1Ga+29y9O6s62TT//i47/0Xzzy+d9O4jHPKQ7t+dvXygWJbLsj1vW0Zu/V+FgwPVtsNHe35lBR3tjIGpvcaLBSnWtXfKdFpIqIsHB2AcIA7rnKQiLIrFgvzOz94GBhr6KodfnanT/7c2Mi0ASDvQUQgFmVIjVWQs8MKllY0BNVFUXx7ALz7g4LM2kjneatv/mOa7ZQERxJoXV4ZYz2Sc4VgEGWAQAAIgFbsCmABwBSwamnf+P4k3+nPLXk89RxykgMwEUW91C9DUK0zS3xrigWotBglCTT0wo13OXuFxMoeNtZve3SrNtNm5evKEBBBO9MqRRUKoEOAHta1nYJruL0Yo8KRLY5ZKkIeWf77nVApW23c+tb/7aYlMkPXSOgsARRFVWATky5bGpVzhkAgtp4v2uDG4JFoASaoLtxZ+vyOy7tCt1zJ6bh8tQPEEdYYhVARCTAIrEPXd523abYtAgqR8S9d62YFvxWq18sD0QppZWqjJnaGDt3j2Be1DpfW+duJ7tytXt7hZQBAHGspyeVDiQMBg3s09NivmKR3BKDZLZX3IFFhcHGyy/Z1VUKDPKemm8AEgZIBAJBrVzMbAKAWg8Kaw0wuC1krU+z1p115Pv6rQ4BR6h2Q6FjFykJO6IHhl7F1m3QX8DvelJ7N56QUfLNOgD1LPlKgTGgKJyf9cK7PNPSv3oUVkS23XLNRufKu9DakmLOUiqannGMFIVEhftxu8JD785hL8gTmW2WAojkeUE2Ispbncbrb2BomJn3KaPAQOJBRAHFkRQiWMhl6cAMhv1Khb17BYIekNC32r6bDibEfcu1HQqOisQqDEOyvc/A3bh1H/RKEHnxrWax2xuwcKh1EHmblU6c0mEZvJNtM9N2Y8V7YujcvtVdWyEoItlZl0vB2Di43IQBBCGI39HioFsIUBhOu5kgOmcBAIQhNJ0bN9PNTVJa9szEUrAktcCCCknpfgQ9pyt3hsrjDtneEEAEA0OhEe9smg7s+0cHh0ys/qjg0AfF24EGs+u1fda+txKlSMqwrt0loiJfRpmQtBbng4W54MSSt/nQow+7xBcFJlu9Y9fW0RgBEO/jiQkKQrCprtR0+f7hUD5NBZhzK8JFAEP71g0cOgsHOm3xQuXSLnuHYICIPKM2aXurffM6abPfRRI4DibGlTbIIkN7jL2PR/CAcdjE2rkZyqA2ASIVJYr3J9bQbLJL+SiKwvs8890uUrHvm5goRkIUNIEZP3eWGRGK/S52ldnuecH7sRaIDAJoZmZJmJmD6VlVrYrn/czuANAzytssBWF2HsQjIrBkW5tFAefBcduXJIKobNqGblcAwHlSiqJw9Qffl1YT9O7VhhBhbikJ49OnnUiRtD3c9e2p+VBxJKbC3Zrp0If3Pmu/T0EQfavLWSZF5rkwhgYK/R+wdOq0qVbY2ft7ZxGBvS6V9Ni48560UWNVSBLwuwsP7TwJJc3Bec/MjgFR2EM332eVURwPAISYWre2oRQwofPu1r/7942fvkRBCYasrL3gorwjcVD7xCcxKpH1oEjHMe8XF3S4OGxf4bbkKf7pRRDs9VHcjWTbpTL6BSCIyDWbbHMdhAIsACaMScQrLYhhuRKfPNV69RWdBL1y2bsVlO12Hft4ckIF2mbWJOUgDIO43Cl8NbLP8QggiOwy8V55J9aDVgTM4gUE+wZh6ceCFR1GEdRq6+rFztZG/dXXsq2639rSUdLbzAyQQZQX8VYUleeWKo88JnECwh4xrJV1EntmHlqRiMhAOeuVYHkvY/GR4rCJtR8Ga+x7HzYcHjh0MhCRbXbEe0EEBkKEJPQgoFRhmRx79LHG66/ff/UkwojRzLSIQrZBpUREpppIf4bd10eEiN46zq0OI+99Yb1VSkE/s3BbnRz+BUTvnF++KbklRBWGbG3hiS8eFYzCZHw+WFwyExPiPYJzzSbFSfnYCdnjZMJ+bYhDxBEj1l7VAGUHgQQBoCiuKAgse2YKEk/oWpsAUDyoqLQOI2BBo0kFzubJsePh1Iytr5HWxUJUwVBMy6AvzDqJzdi4OI86MNUaOG+qNaKiPPxAi9gl7xC897YjUJU8Fyih0qZSAWFAFJRtq+nO9jQTBFH86GPgCdK2dxkAqTBQpdiUyro8QVEAIi7PyJh8bbn+ynnSJp6ZSRbmxXI/ze2o4IgRaz/cTbTItg9n9wl5o1XwkUVEE4YBsGitSRE7r0pJ9dSZ1ZXbFATi/f62eETxPp6cgqgknS5VKyoM2KVBuQomEL5HBXcEEUgtADhnAxEGCGfmpRfeVxyCsjs4AoCQc+sa7YlPfFK8iEtBKSQDiCIsjn2nKyCmXLat5uZrbyiGvNl09QaeWEK3Wz2le65bHwCOhvK+c4OdHS/A4dd9HRQEiN7nrQYhMiKKkNZkAhCRIOhlHTtfevQcBAH1I0uHnTO9LgkAQDQ9TSICEJbLoDQwUBJTEAzvZbILCIBCttsVArAekNC65MQxisvgh/UyBERG4AG/REhre+PG+gs/ZBJTrSKROA82B/YYajM9Uzp9zjmpv/gTcM6T6GpJArN54V3bbjIJsqDsDmx8AJtQ7IuHQGLdG7s0LUS0uZV6E/s7kWqtkRQ7j1oBIBJ5a5O5mWR2Mbt1nQID28vPIf3Xe0zKemwSnUOtg2q5mMNUYLQxLsvu7ssGIHGtJjA75wAQrYsmJ8rHTrTfOo9JInvsq0NvRKIgXV1b/f73ap/4VO3kKVMqowqFBJiyRqP+8ov111/SDGgMp51gfsE765pNYjGVMkNhRPnI7u2HwUNMLOytAgH6/2f2EMfplSt5fRMiXajH3jlhB0DK6J4niFmCsHLuXOfaFYqC7aX6YJARmF0yMa6iwGU2KJUpCpkdkHJp19n8XtqxCCjKtzYlbWNUYm+BUDFPf+ZTzUvvEPh9zui1CcU1KBNJs1X/y7+sl0vh5FRQqoJI3qin62uQZSoKWSvwjkxYPnbaAyokiiIhQu+hZ2HZdZcOQfc6ElPhB0PvDkrf3iisUAvzyvPf8Zp7Co0i3+3my7dVFBYyDAAAUawvnzuN5TIzD3kit12mvfUgCDDrSgJE6D1GQfPtt7jZLqqP3hVEkOWtdy+LOHSOCDnPk6Wlic98xrW7Rf7qMIbtmQiI4kgpHUeU5+nN61tvvbp14fV0ZZkQVBIJAAJD7uMzZ9VYlawTIlOt7CDTEOnvZss9aDzExNoBYVEaA3XzG9/oXrtpdNhfRQoqvfnOO9ntWyaIZGAnyG04OVlaXOLM7i0x5YVNkpjxce+ElNLVMnhPcdy5vbz5gx9SFPSz9rdHc/hvEoHAdG4tN9543XtA1ILgczv/xZ+pPPJo3moXtemxR3Lc+wtFDUBQREGgo0RHMRlTXCUi+TQPl+ZrJ04X6pcpJ6acwM7iM4eOh5hYQ+tBQdTi+d0//uOt11/TcbjDEo2ALBsv/WT15RdFK5FeaIQGHHv8ccdMvXCJnjcJiCh3weQkRgk6i0msggCB8nbr+r/5E067ovSQbJN+D/q5qIgIqASU0Z13Lqz8zV8AcpEpKSLHfvO3ymfOuHYbEHfxYDi+pCc+i4sUFiki6BEBXZ7FiwtjTz7LwooFCEtzs4XxY9sBegQY9hATa/v2sUikV7/3N+lbb6tyeVewee/gKFx9/rv111/VSSQsSOiyrPrYmerpU9nWJnoP7ESY2XM3lSRMTp1kBgHRlRIRKhNs/eAFd2dVRWVglr4XalcrUhg4iq+YIa5svf7a8vPf0WFIAuI9Kjj1979Wfu6TPs2FvdAefu3RhxCg2OMOrGXhsXNnx579pKCgiGMuzS+YUgn2bG9x6HiIlXeA3r5thWnQtZtic8pDxCIJYcjVwyyAGji9fiNdXDKVqjCjiAgd+3u/ufqDF5pvXyDhIhlUl0ulU6eoVBGfs9JhtVJsfmLGSyLedpuktCANCvYP82CQQA8AwA7ynJCa716pnL4VzY4ToHgRRSd/6VfvjM9svPiCdBoMSKREYbEpwPCaDouMNhbxOSAGk1OVc+eC8QmxDoFzL8ncXDw9KW4obuLI0Auz8+exH41fQPYzgB8R0I5x7IeLiAgpl2er3/lO491LkFnxfjBJEaAQYRyWFpdKx09Y78uL88nkJBSBl6RNHG5cvJivrpEhJEQdivfM4pwLJ8bGTxx3HgiEA2hfvb51/o3urZuSWbGOmYH74nF4aYdIShuNFMd6YjZeWmSto5mp6uwcegAUJkSF7Ws3Ny5c4OXb+dYm51aYBbblTi+Xn5QJAzM5Hs8t6skpJELrgD0gxfPz8cwU9KOc700pPkgNvohpH7b7i8hDTawCAsDCgEqpOGzeuL514RKKY+tEAAm1NhiEGIdoQu8t2BzCePqRsyC9200ijNK8uey2toBZerEoqCqVyrEljdr34w9VHLpOt/7mW2Jz5yy7HB2L88xcaOKskJRSymgTKGMgCkAp7z1Y5xEmHjljwqRX+kSANWXNRnZr1W5t+XbTdpouzdhmwl4rjcZQHAXlMVWOVVxCRu9sUZ2LyqXq/HxQrhT5GgXuSixB2LMPyEeLjzWxpG8sF9q6cSPvNEmAWKDIchAA7z0KIhKq+PhiMj4mzkPBIBFBQaI8zSCzLIKIFJBKYvRFMfBB2WaHSGm93t3YEptjseczgogMklIQi8hlEWZkKbLCRFM4Nlaem8fhFagIKvS5S+ubWXNLbE5eiiQyQfRIAAIs4hm9FxDRASVRMl6NxsZEGXQ9MXSf6W9ErPeCuxCrHw0hxY6/kLab3E45y7wvvGhIRBgYisM4LmMUsPN9dYh6JToAgAgIARgARVgYkEWwqOdeEIIFABWBZ59lLks5tz7PvffoHYBAQTBEQESlSCttDEWRikMyoTBgr2Z9fxFadJhArM3aTdfscJpamxdlA7FwFGilwkiVoqBUDuIYCMVzPwT7/kqV9O19B4ePObH670QARBUWhO3DBQFRFAszAw8S3XaZDwv543tNIcr2o94jVtFEUWcBEHmgXMngBwcqPFKRCQsMzNLbQWKwhU7PTSwiIB4QiyQRFvHMwNyL3CAkIq0IAYt5sLA79INs748D1a4K7Eush3pVuB+K4ALvi5DBvjJcRBujL6L6dtqPitMAAIEAQfobOwMAAUlvKiyEIgzsTyLSK2w0vINX/8yC7L1OFFTYjrzCoXaLEwkAxAOIADERIBKoXjiEiIjrG8wQe+XjDzna6v742BFroOb0/IK4cwh3YafvuSdpaM8B23/ssAbsqCOzY6T7wqjPhh0/tfsHpWixt8P8duqtCFCxH2/Ro36K2ZEnFcDDS6ydkVi7R24wTRSZVLtHfXdpo3s3RLLNENzDj/ucO9SxQR92v8Vhau4h4aBikmwf+Z7w4B3Pw3jYiDU07wxSenrf7EeWorjfXT5/L9irIL/3scU9f9z/LcrOin3Df96l0/uEaMu2qndYeNiINYTiVg47yA4xCXhvAsiu7g1HjMFdHoMPhiOS+rwLDxmxesWP4C6lxt5bYs+ug4eHfNcpwyS478J+1wHv6+09uj3cq33PEtkR3XcUkgrhoSPWMPbyZi9X3tfp9/7kPdLrQ+K+ffjIBd4B4aEkVt8VAwA71noyqJh995nxg82Y+6Y6HgTuLcn2+XaXrDqgbr1/PJTEugcGpLlrbs8Hetb3TXUcCI8PT7j32KujL6gGeIiJNSgzu4+98764FxNknyNkyCK2Y0360UyOd/uRvWu9oXN2f3OkSPcwEwsA+haeD3jyvtjXnLnPJ9uZPQJwtyzDnT9w11Y/CDdl3z+PCh5iYg2wIzjuvd3j+6+b9jtg+MeHKsd8BPggj8YRWPrdAw89sXYNyXu82/ccyLv+Rn/Nud+a/z01+5FxQY6klBrGQxzzPsJRxkMvsXbhQCPahn8c3/O0exCtH32MJNYIB4KPm8R6YDjK4ZBHASOJNcKBYESsEQ4EI2KNcCAYEWuEA8GIWCMcCEbEGuFAcKS27h3h44ORxBrhQHBoW/eO8PHGSGKNcCAYEWuEA8GIWCMcCEarwhEOBCOJNcKBYBA2c/TyPEZ4mDEwNxxqL0b42GE0FY5wIBgp7yMcCEYSa4QDwYhYIxwIRsQa4UAwItYIB4IRsUY4EIyINcKBYESsEQ4EI2KNcCAYEWuEA8GIWCMcCEbEGuFAMCLWCAeCHWWMRqV5RvgA2Le+/EhijXAg2JlXOBJXI3xEGEmsEQ4EuwP9hmXWKOZvhA+MHcr7rl0eRor8CB8Y+h7ZOSNejfABUJBJY7HFy36bBD3gOuYjPNzoz3cCd9kveYQRPjx21XmX0fw3wocFCoCMJNYIBwLd27672PQWe/tWF9rVh9u8paAsf+geHhCwv9PgSJHcB3QXAuy7g1Dh0ul/hSAE0p8KPQKCAG9/C/DhWFG0f2QlIgpA7yE67K4cRfi7EGCbG8Pg4QOw2O/z/wfSKDETUiUougAAAABJRU5ErkJggg==";
const DEFAULT_BAUD_RATE = 9600;
const PAPER_WIDTH_CHARS = 32;
function settingsPath() {
  return path.join(electron.app.getPath("userData"), "printer-settings.json");
}
function getPrinterSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), "utf-8"));
  } catch {
    return { comPort: null };
  }
}
function savePrinterSettings(comPort) {
  const settings = { comPort };
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf-8");
  return settings;
}
async function listPrinterPorts() {
  const { SerialPort } = await import("serialport");
  const ports = await SerialPort.list();
  return ports.map((p) => ({
    path: p.path,
    manufacturer: p.manufacturer,
    isLikelyBluetooth: (p.pnpId || "").toUpperCase().includes("BTHENUM")
  }));
}
async function createPrinter(portName) {
  let escposModule;
  let SerialportAdapterCtor;
  try {
    escposModule = await import("@node-escpos/core");
    SerialportAdapterCtor = (await import("@node-escpos/serialport-adapter")).default;
  } catch (error) {
    throw new Error(`Printer tidak tersedia: ${error.message}`);
  }
  const SerialportAdapter = SerialportAdapterCtor;
  const escpos = escposModule;
  const device = new SerialportAdapter(portName, { baudRate: DEFAULT_BAUD_RATE });
  const printer = new escpos.Printer(device, { width: PAPER_WIDTH_CHARS });
  return { device, printer, escpos };
}
function wrapText(text, maxWidth = PAPER_WIDTH_CHARS) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxWidth) {
      if (current) lines.push(current);
      current = word.length > maxWidth ? word.slice(0, maxWidth) : word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}
function printWrapped(printer, text, maxWidth = PAPER_WIDTH_CHARS) {
  wrapText(text, maxWidth).forEach((line) => printer.text(line));
}
function printFallbackLogo(printer) {
  printer.align("ct");
  printer.style("b").size(1, 1);
  printer.text("BY ME");
  printer.style("normal").size(0, 0);
  printer.text("-".repeat(PAPER_WIDTH_CHARS));
}
function rightAlignLine(label, value, width = PAPER_WIDTH_CHARS) {
  const cleanLabel = label.endsWith(":") ? label : `${label}:`;
  const padding = Math.max(0, width - cleanLabel.length - value.length);
  return `${cleanLabel}${" ".repeat(padding)}${value}`;
}
function printItemPriceLine(qty, unitPrice, totalPrice, width = PAPER_WIDTH_CHARS) {
  const left = `${qty} x ${unitPrice.toLocaleString("id-ID")}`;
  const right = totalPrice.toLocaleString("id-ID");
  const padding = Math.max(0, width - left.length - right.length);
  return `${left}${" ".repeat(padding)}${right}`;
}
async function printReceiptToSerial(receipt) {
  const settings = getPrinterSettings();
  if (!settings.comPort) {
    throw new Error("Belum ada COM port printer yang dipilih. Atur dulu di Pengaturan Printer.");
  }
  const portName = settings.comPort;
  const { device, printer, escpos } = await createPrinter(portName);
  return new Promise((resolve, reject) => {
    device.open(async (err) => {
      if (err) {
        reject(new Error(`Gagal membuka printer di ${portName}: ${err.message}`));
        return;
      }
      try {
        printer.align("ct");
        if (receipt.showLogo !== false) {
          try {
            const logoImage = await escpos.Image.load(THERMAL_LOGO_BASE64, "image/png");
            await printer.image(logoImage, "d24");
          } catch (logoErr) {
            console.error("[printer] Gagal cetak logo raster, pakai fallback teks:", logoErr);
            try {
              printFallbackLogo(printer);
            } catch (fallbackErr) {
              console.error("[printer] Fallback logo teks gagal juga:", fallbackErr);
            }
          }
        }
        printer.style("b").size(1, 1);
        printWrapped(printer, receipt.storeName);
        printer.style("normal").size(0, 0);
        printWrapped(printer, receipt.address);
        printWrapped(printer, `Telp. ${receipt.phone}`);
        printer.text("-".repeat(PAPER_WIDTH_CHARS));
        printer.align("lt");
        printer.text(rightAlignLine("No", receipt.transactionId));
        printer.text(rightAlignLine("Tanggal", receipt.timestamp));
        printer.text(rightAlignLine("Kasir", receipt.cashierName));
        printer.text(rightAlignLine("Pelanggan", receipt.customer));
        printer.text(rightAlignLine("Metode", receipt.paymentMethod));
        printer.text("-".repeat(PAPER_WIDTH_CHARS));
        receipt.items.forEach((item) => {
          printWrapped(printer, item.name);
          printer.text(
            printItemPriceLine(item.qty, item.price, item.qty * item.price)
          );
        });
        printer.text("-".repeat(PAPER_WIDTH_CHARS)).text(rightAlignLine("Subtotal", receipt.subtotal.toLocaleString("id-ID"))).text(rightAlignLine("Diskon", receipt.discountAmount.toLocaleString("id-ID"))).text(rightAlignLine("Total", receipt.total.toLocaleString("id-ID"))).text(rightAlignLine("Kembalian", receipt.change.toLocaleString("id-ID"))).text("-".repeat(PAPER_WIDTH_CHARS));
        printer.align("ct");
        printWrapped(printer, receipt.footerNote);
        printer.text("*** Terima Kasih ***");
        await printer.feed(2).cut().close();
        resolve();
      } catch (printErr) {
        reject(new Error(`Gagal mengirim data ke printer: ${printErr.message}`));
      }
    });
  });
}
exports.getPrinterSettings = getPrinterSettings;
exports.listPrinterPorts = listPrinterPorts;
exports.printReceiptToSerial = printReceiptToSerial;
exports.savePrinterSettings = savePrinterSettings;
